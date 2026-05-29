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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  )

  // 1. APIキー認証
  const authHeader = req.headers.get("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401)
  }

  const apiKey = authHeader.slice(7)
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

  if (!Array.isArray(body.readings) || body.readings.length === 0) {
    return jsonResponse({ error: "readings array is required" }, 400)
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
  interface ProcessedSensor {
    sensor_type: string
    sensor_id: string
    value: number
  }
  const processedSensors: ProcessedSensor[] = []

  for (const reading of toProcess) {
    const { data: sensor } = await supabase
      .from("sensors")
      .select("id")
      .eq("device_id", device.id)
      .eq("sensor_type_id", reading.sensor_type)
      .eq("is_active", true)
      .maybeSingle()

    let sensorId: string

    if (sensor) {
      sensorId = sensor.id
    } else {
      const { data: newSensor, error: insertError } = await supabase
        .from("sensors")
        .insert({ device_id: device.id, sensor_type_id: reading.sensor_type })
        .select("id")
        .single()

      if (insertError || !newSensor) {
        skipped.push({ sensor_type: reading.sensor_type, reason: "failed to register sensor" })
        continue
      }
      sensorId = newSensor.id
    }

    processedSensors.push({ sensor_type: reading.sensor_type, sensor_id: sensorId, value: reading.value })
  }

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

  await supabase
    .from("devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", device.id)

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

      for (const ps of processedSensors) {
        const threshold = thresholdMap.get(ps.sensor_type)
        if (!threshold) continue

        let breachDirection: "high" | "low" | null = null
        if (threshold.alert_min !== null && ps.value < threshold.alert_min) {
          breachDirection = "low"
        } else if (threshold.alert_max !== null && ps.value > threshold.alert_max) {
          breachDirection = "high"
        }

        if (!breachDirection) continue

        // アラートストーム防止：同一センサー・同一 alert_type の未解消アラートが存在すればスキップ
        const { data: existingAlert } = await supabase
          .from("alerts")
          .select("id")
          .eq("sensor_id", ps.sensor_id)
          .eq("alert_type", "threshold_breach")
          .is("resolved_at", null)
          .maybeSingle()

        if (existingAlert) continue

        await supabase.from("alerts").insert({
          sensor_id: ps.sensor_id,
          alert_type: "threshold_breach",
          triggered_value: ps.value,
          breach_direction: breachDirection,
        })
      }
    }
  }

  return jsonResponse({ accepted, skipped })
})
