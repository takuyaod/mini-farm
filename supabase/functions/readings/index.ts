import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface SensorReading {
  sensor_type: string
  value: number
}

interface RequestBody {
  timestamp?: string
  idempotency_key?: string
  readings: SensorReading[]
}

interface ProcessedSensor {
  sensor_type: string
  sensor_id: string
  value: number
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // 環境変数の存在確認（未設定時はフェイルファスト）
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server misconfiguration" }, 500)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // 1. APIキー認証
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401)
  }

  const apiKey = authHeader.slice(7)
  if (!apiKey) {
    return jsonResponse({ error: "Unauthorized" }, 401)
  }

  const apiKeyHash = await sha256Hex(apiKey)

  const { data: device } = await supabase
    .from("devices")
    .select("id, zone_id")
    .eq("api_key_hash", apiKeyHash)
    .maybeSingle()

  if (!device) {
    return jsonResponse({ error: "Unauthorized" }, 401)
  }

  // ゾーンの is_active チェック（非アクティブゾーンからのデータ送信を拒否）
  const { data: zone } = await supabase
    .from("zones")
    .select("is_active")
    .eq("id", device.zone_id)
    .maybeSingle()

  if (!zone || !zone.is_active) {
    return jsonResponse({ error: "Zone is inactive" }, 403)
  }

  // 2. バリデーション
  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400)
  }

  if (!Array.isArray(body.readings) || body.readings.length === 0) {
    return jsonResponse({ error: "readings array is required" }, 400)
  }

  if (body.timestamp && isNaN(Date.parse(body.timestamp))) {
    return jsonResponse({ error: "Invalid timestamp format" }, 400)
  }

  const recordedAt = body.timestamp ?? new Date().toISOString()

  // idempotency_key の重複チェック
  if (body.idempotency_key) {
    const { data: existing } = await supabase
      .from("readings")
      .select("id")
      .eq("idempotency_key", body.idempotency_key)
      .maybeSingle()

    if (existing) {
      return jsonResponse({ accepted: [], skipped: [], idempotent: true })
    }
  }

  // 3. センサー種別マスタ取得
  const { data: sensorTypeMasters } = await supabase
    .from("sensor_type_masters")
    .select("id")

  const validSensorTypes = new Set(
    (sensorTypeMasters ?? []).map((s: { id: string }) => s.id),
  )

  const accepted: string[] = []
  const skipped: { sensor_type: string; reason: string }[] = []
  const toProcess: SensorReading[] = []

  for (const reading of body.readings) {
    if (!validSensorTypes.has(reading.sensor_type)) {
      skipped.push({ sensor_type: reading.sensor_type, reason: "not registered" })
    } else {
      toProcess.push(reading)
    }
  }

  if (toProcess.length === 0) {
    return jsonResponse({ accepted, skipped })
  }

  // 4. センサー解決・未登録センサーは自動登録
  // 対象センサー種別を一括取得してN+1クエリを回避する
  const sensorTypes = toProcess.map((r) => r.sensor_type)
  const { data: existingSensors } = await supabase
    .from("sensors")
    .select("id, sensor_type_id")
    .eq("device_id", device.id)
    .in("sensor_type_id", sensorTypes)
    .eq("is_active", true)

  const existingSensorMap = new Map(
    (existingSensors ?? []).map((s: { id: string; sensor_type_id: string }) => [s.sensor_type_id, s.id]),
  )

  // 未登録センサーを一括登録
  const missingSensorTypes = toProcess
    .filter((r) => !existingSensorMap.has(r.sensor_type))
    .map((r) => r.sensor_type)

  if (missingSensorTypes.length > 0) {
    const { data: newSensors, error: insertError } = await supabase
      .from("sensors")
      .insert(missingSensorTypes.map((sensorTypeId) => ({ device_id: device.id, sensor_type_id: sensorTypeId })))
      .select("id, sensor_type_id")

    if (!insertError && newSensors) {
      for (const s of newSensors as { id: string; sensor_type_id: string }[]) {
        existingSensorMap.set(s.sensor_type_id, s.id)
      }
    } else {
      for (const sensorType of missingSensorTypes) {
        skipped.push({ sensor_type: sensorType, reason: "failed to register sensor" })
      }
    }
  }

  const processedSensors: ProcessedSensor[] = toProcess
    .filter((r) => existingSensorMap.has(r.sensor_type))
    .map((r) => ({ sensor_type: r.sensor_type, sensor_id: existingSensorMap.get(r.sensor_type)!, value: r.value }))

  if (processedSensors.length === 0) {
    return jsonResponse({ accepted, skipped })
  }

  // 5. readings INSERT + last_seen_at UPDATE
  // idempotency_key は UNIQUE 制約があるため最初のレコードにのみ付与し、
  // リクエスト単位の重複検知に使用する
  const readingsToInsert = processedSensors.map((ps, index) => ({
    sensor_id: ps.sensor_id,
    value: ps.value,
    recorded_at: recordedAt,
    ...(index === 0 && body.idempotency_key ? { idempotency_key: body.idempotency_key } : {}),
  }))

  const { error: insertReadingsError } = await supabase
    .from("readings")
    .insert(readingsToInsert)

  if (insertReadingsError) {
    return jsonResponse(
      { error: "Failed to insert readings", detail: insertReadingsError.message },
      500,
    )
  }

  const { error: updateDeviceError } = await supabase
    .from("devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", device.id)

  if (updateDeviceError) {
    console.error("Failed to update last_seen_at:", updateDeviceError.message)
  }

  processedSensors.forEach((ps) => accepted.push(ps.sensor_type))

  // 6. アラート判定
  const { data: zonePlant } = await supabase
    .from("zone_plants")
    .select("plant_id")
    .eq("zone_id", device.zone_id)
    .is("harvested_at", null)
    .maybeSingle()

  if (zonePlant) {
    const { data: thresholds } = await supabase
      .from("plant_thresholds")
      .select("sensor_type_id, alert_min, alert_max")
      .eq("plant_id", zonePlant.plant_id)

    if (thresholds) {
      const thresholdMap = new Map(
        thresholds.map((t: { sensor_type_id: string; alert_min: number | null; alert_max: number | null }) => [
          t.sensor_type_id,
          { alert_min: t.alert_min, alert_max: t.alert_max },
        ]),
      )

      // 閾値超過センサーを特定
      const breachingSensors: { ps: ProcessedSensor; breachDirection: "high" | "low" }[] = []
      for (const ps of processedSensors) {
        const threshold = thresholdMap.get(ps.sensor_type)
        if (!threshold) continue

        let breachDirection: "high" | "low" | null = null
        if (threshold.alert_min !== null && ps.value < threshold.alert_min) {
          breachDirection = "low"
        } else if (threshold.alert_max !== null && ps.value > threshold.alert_max) {
          breachDirection = "high"
        }

        if (breachDirection) {
          breachingSensors.push({ ps, breachDirection })
        }
      }

      if (breachingSensors.length > 0) {
        // アラートストーム防止：未解消アラートを一括取得してN+1クエリを回避
        const breachingSensorIds = breachingSensors.map(({ ps }) => ps.sensor_id)
        const { data: existingAlerts } = await supabase
          .from("alerts")
          .select("sensor_id")
          .in("sensor_id", breachingSensorIds)
          .eq("alert_type", "threshold_breach")
          .is("resolved_at", null)

        const existingAlertSet = new Set(
          (existingAlerts ?? []).map((a: { sensor_id: string }) => a.sensor_id),
        )

        const alertsToInsert = breachingSensors
          .filter(({ ps }) => !existingAlertSet.has(ps.sensor_id))
          .map(({ ps, breachDirection }) => ({
            sensor_id: ps.sensor_id,
            alert_type: "threshold_breach",
            triggered_value: ps.value,
            breach_direction: breachDirection,
          }))

        if (alertsToInsert.length > 0) {
          await supabase.from("alerts").insert(alertsToInsert)
        }
      }
    }
  }

  return jsonResponse({ accepted, skipped })
})
