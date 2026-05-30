import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface SensorReading {
  sensor_type: string
  value: number
}

interface BatchItem {
  timestamp?: string
  idempotency_key?: string
  readings: SensorReading[]
}

interface RequestBody {
  batches: BatchItem[]
}

interface ProcessedSensor {
  sensor_type: string
  sensor_id: string
  value: number
}

interface BatchResult {
  accepted: string[]
  skipped: { sensor_type: string; reason: string }[]
  idempotent?: boolean
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

  // 2. バリデーション
  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400)
  }

  if (!Array.isArray(body.batches) || body.batches.length === 0) {
    return jsonResponse({ error: "batches array is required" }, 400)
  }

  if (body.batches.length > 100) {
    return jsonResponse({ error: "batches must not exceed 100 items" }, 400)
  }

  // 3. センサー種別マスタを一括取得（全バッチで共有）
  const { data: sensorTypeMasters } = await supabase
    .from("sensor_type_masters")
    .select("id")

  const validSensorTypes = new Set(
    (sensorTypeMasters ?? []).map((s: { id: string }) => s.id),
  )

  // 4. アラート判定用の zone_plant・閾値を一括取得（全バッチで共有）
  const { data: zonePlant } = await supabase
    .from("zone_plants")
    .select("plant_id")
    .eq("zone_id", device.zone_id)
    .is("harvested_at", null)
    .maybeSingle()

  const thresholdMap = new Map<string, { alert_min: number | null; alert_max: number | null }>()

  if (zonePlant) {
    const { data: thresholds } = await supabase
      .from("plant_thresholds")
      .select("sensor_type_id, alert_min, alert_max")
      .eq("plant_id", zonePlant.plant_id)

    if (thresholds) {
      for (const t of thresholds as { sensor_type_id: string; alert_min: number | null; alert_max: number | null }[]) {
        thresholdMap.set(t.sensor_type_id, { alert_min: t.alert_min, alert_max: t.alert_max })
      }
    }
  }

  // 5. センサー解決マップを事前構築（全バッチで共有・必要に応じて更新）
  const { data: existingSensors } = await supabase
    .from("sensors")
    .select("id, sensor_type_id")
    .eq("device_id", device.id)
    .eq("is_active", true)

  const sensorMap = new Map<string, string>(
    (existingSensors ?? []).map((s: { id: string; sensor_type_id: string }) => [s.sensor_type_id, s.id]),
  )

  // 6. idempotency_key の一括重複チェック（N+1クエリを回避）
  const allIdempotencyKeys = body.batches
    .map((b) => b.idempotency_key)
    .filter((k): k is string => typeof k === "string")

  const existingIdempotencyKeySet = new Set<string>()
  if (allIdempotencyKeys.length > 0) {
    const { data: existingReadings } = await supabase
      .from("readings")
      .select("idempotency_key")
      .in("idempotency_key", allIdempotencyKeys)

    for (const r of existingReadings ?? []) {
      if (r.idempotency_key) {
        existingIdempotencyKeySet.add(r.idempotency_key)
      }
    }
  }

  // 7. 各バッチを受け取り順に処理
  const results: BatchResult[] = []
  let anyInsertSucceeded = false

  for (const batch of body.batches) {
    if (!Array.isArray(batch.readings) || batch.readings.length === 0) {
      results.push({ accepted: [], skipped: [{ sensor_type: "*", reason: "readings array is required" }] })
      continue
    }

    if (batch.timestamp && isNaN(Date.parse(batch.timestamp))) {
      results.push({ accepted: [], skipped: [{ sensor_type: "*", reason: "invalid timestamp format" }] })
      continue
    }

    const recordedAt = batch.timestamp ?? new Date().toISOString()

    // idempotency_key の重複チェック（事前に一括取得済みの結果を参照）
    if (batch.idempotency_key && existingIdempotencyKeySet.has(batch.idempotency_key)) {
      results.push({ accepted: [], skipped: [], idempotent: true })
      continue
    }

    const accepted: string[] = []
    const skipped: { sensor_type: string; reason: string }[] = []
    const toProcess: SensorReading[] = []

    for (const reading of batch.readings) {
      if (!validSensorTypes.has(reading.sensor_type)) {
        skipped.push({ sensor_type: reading.sensor_type, reason: "not registered" })
      } else {
        toProcess.push(reading)
      }
    }

    if (toProcess.length === 0) {
      results.push({ accepted, skipped })
      continue
    }

    // 未登録センサーを自動登録（sensorMap にないセンサー種別のみ）
    const missingSensorTypes = toProcess
      .filter((r) => !sensorMap.has(r.sensor_type))
      .map((r) => r.sensor_type)

    if (missingSensorTypes.length > 0) {
      const { data: newSensors, error: insertError } = await supabase
        .from("sensors")
        .insert(missingSensorTypes.map((sensorTypeId) => ({ device_id: device.id, sensor_type_id: sensorTypeId })))
        .select("id, sensor_type_id")

      if (!insertError && newSensors) {
        for (const s of newSensors as { id: string; sensor_type_id: string }[]) {
          sensorMap.set(s.sensor_type_id, s.id)
        }
      } else {
        for (const sensorType of missingSensorTypes) {
          skipped.push({ sensor_type: sensorType, reason: "failed to register sensor" })
        }
      }
    }

    const processedSensors: ProcessedSensor[] = toProcess
      .filter((r) => sensorMap.has(r.sensor_type))
      .map((r) => ({ sensor_type: r.sensor_type, sensor_id: sensorMap.get(r.sensor_type)!, value: r.value }))

    if (processedSensors.length === 0) {
      results.push({ accepted, skipped })
      continue
    }

    // readings INSERT
    // idempotency_key は UNIQUE 制約があるため最初のレコードにのみ付与し、
    // バッチ単位の重複検知に使用する
    const readingsToInsert = processedSensors.map((ps, index) => ({
      sensor_id: ps.sensor_id,
      value: ps.value,
      recorded_at: recordedAt,
      ...(index === 0 && batch.idempotency_key ? { idempotency_key: batch.idempotency_key } : {}),
    }))

    const { error: insertReadingsError } = await supabase
      .from("readings")
      .insert(readingsToInsert)

    if (insertReadingsError) {
      results.push({
        accepted: [],
        skipped: processedSensors.map((ps) => ({ sensor_type: ps.sensor_type, reason: "failed to insert" })),
      })
      continue
    }

    processedSensors.forEach((ps) => accepted.push(ps.sensor_type))
    anyInsertSucceeded = true

    // アラート判定
    if (zonePlant && thresholdMap.size > 0) {
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

    results.push({ accepted, skipped })
  }

  // 8. last_seen_at を一括更新（全バッチ処理完了後に1回のみ実行）
  // INSERT が1件でも成功した場合のみ更新し、readings/index.ts の設計と一貫性を持たせる
  if (anyInsertSucceeded) {
    const { error: updateDeviceError } = await supabase
      .from("devices")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", device.id)

    if (updateDeviceError) {
      console.error("Failed to update last_seen_at:", updateDeviceError.message)
    }
  }

  return jsonResponse({ results })
})
