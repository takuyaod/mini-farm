import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// devices.mac_address の CHECK 制約と同じ形式（コロン区切り大文字16進数）
const MAC_ADDRESS_REGEX = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/

// PostgreSQL の unique_violation エラーコード（devices.mac_address の UNIQUE 制約に抵触した場合に返る）
const POSTGRES_UNIQUE_VIOLATION = "23505"

type DeviceStatus = "pending" | "active" | "revoked"

interface RequestBody {
  mac_address?: string
  firmware_ver?: string
}

interface DeviceRow {
  id: string
  status: DeviceStatus
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

  // enroll は無認証エンドポイント（Authorization ヘッダー不要）。
  // Service Role Key で RLS をバイパスし、デバイス識別・状態遷移はこの関数内で完結させる。
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // 1. リクエストボディのパース
  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400)
  }

  // 2. mac_address の形式バリデーション
  const macAddress = body.mac_address
  if (typeof macAddress !== "string" || !MAC_ADDRESS_REGEX.test(macAddress)) {
    return jsonResponse({ error: "Invalid mac_address format" }, 400)
  }

  // firmware_ver は任意。指定された場合は文字列であることのみ検証する
  if (body.firmware_ver !== undefined && typeof body.firmware_ver !== "string") {
    return jsonResponse({ error: "Invalid firmware_ver" }, 400)
  }
  const firmwareVer = body.firmware_ver ?? null

  // 3. devices を mac_address で検索
  const { data: existingDevice, error: selectError } = await supabase
    .from("devices")
    .select("id, status")
    .eq("mac_address", macAddress)
    .maybeSingle()

  if (selectError) {
    return jsonResponse({ error: "Failed to look up device", detail: selectError.message }, 500)
  }

  if (!existingDevice) {
    // 未登録 → pending で新規作成（201）
    const { data: newDevice, error: insertError } = await supabase
      .from("devices")
      .insert({
        mac_address: macAddress,
        firmware_ver: firmwareVer,
        status: "pending",
        user_id: null,
        zone_id: null,
      })
      .select("id, status")
      .single()

    if (insertError) {
      // 同一MACの enroll がほぼ同時に競合した場合（UNIQUE制約違反）は、
      // 先に挿入された既存レコードに対する更新（冪等な更新パス）として扱う
      if (insertError.code === POSTGRES_UNIQUE_VIOLATION) {
        return await enrollExistingDevice(supabase, macAddress, firmwareVer)
      }
      return jsonResponse({ error: "Failed to enroll device", detail: insertError.message }, 500)
    }

    return jsonResponse({ status: newDevice.status, device_id: newDevice.id }, 201)
  }

  // revoked は再enrollをブロックする（trg_enforce_device_state_machine も revoked → pending への
  // 遷移を拒否するため、ここで先に弾くことで DB エラーによる 500 化を防ぐ）
  if (existingDevice.status === "revoked") {
    return jsonResponse({ error: "Device is revoked" }, 403)
  }

  // 既知のMAC（pending / active）→ firmware_ver のみ更新し、実際の status を返す（200・冪等）
  return await enrollExistingDevice(supabase, macAddress, firmwareVer)
})

async function enrollExistingDevice(
  supabase: ReturnType<typeof createClient>,
  macAddress: string,
  firmwareVer: string | null,
): Promise<Response> {
  const { data: updatedDevice, error: updateError } = await supabase
    .from("devices")
    .update({ firmware_ver: firmwareVer })
    .eq("mac_address", macAddress)
    .select("id, status")
    .single()

  if (updateError) {
    return jsonResponse({ error: "Failed to update device", detail: updateError.message }, 500)
  }

  const device = updatedDevice as DeviceRow

  if (device.status === "revoked") {
    return jsonResponse({ error: "Device is revoked" }, 403)
  }

  return jsonResponse({ status: device.status, device_id: device.id }, 200)
}
