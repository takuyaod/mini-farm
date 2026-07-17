import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// devices.mac_address の CHECK 制約と同じ形式（コロン区切り大文字16進数）
const MAC_ADDRESS_REGEX = /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/

// devices.firmware_ver は VARCHAR(20)（supabase/migrations/20260528000000_initial_schema.sql）。
// DBの列長を超える値は書き込み前にここで弾く
const FIRMWARE_VER_MAX_LENGTH = 20

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
  // レート制限・登録証明は導入しない：issue #124 / #126 で「濫用対策は MAC形式バリデーション と
  // mac_address の UNIQUE 制約に留め、実害が観測された時点で別issueとして再検討する」と
  // 確定済みのトレードオフ（詳細は docs/specs/DATA_MODEL.md の
  // 「セキュリティ上のトレードオフと緩和策」を参照）。
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

  // firmware_ver は任意。指定された場合は文字列であり、DB列長（VARCHAR(20)）に収まる
  // 空でない値であることを検証する
  if (body.firmware_ver !== undefined) {
    const firmwareVerInput = body.firmware_ver
    if (
      typeof firmwareVerInput !== "string" ||
      firmwareVerInput.length === 0 ||
      firmwareVerInput.length > FIRMWARE_VER_MAX_LENGTH
    ) {
      return jsonResponse({ error: "Invalid firmware_ver" }, 400)
    }
  }
  const firmwareVer = body.firmware_ver ?? null

  // 3. devices を mac_address で検索
  const { data: existingDevice, error: selectError } = await supabase
    .from("devices")
    .select("id, status")
    .eq("mac_address", macAddress)
    .maybeSingle()

  if (selectError) {
    console.error("Failed to look up device:", selectError)
    return jsonResponse({ error: "Failed to look up device" }, 500)
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
      console.error("Failed to enroll device:", insertError)
      return jsonResponse({ error: "Failed to enroll device" }, 500)
    }

    return jsonResponse({ status: newDevice.status, device_id: newDevice.id }, 201)
  }

  // revoked は再enrollをブロックする（trg_enforce_device_state_machine も revoked → pending への
  // 遷移を拒否するため、ここで先に弾くことで DB エラーによる 500 化を防ぐ）。
  // ただしここは早期リターンによる高速経路に過ぎず、実際の不変性保証は
  // enrollExistingDevice() 内の条件付き UPDATE（status<>'revoked'）で行う
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
  // revoked デバイスの firmware_ver が更新されないよう、状態条件を更新クエリ自体に
  // 組み込み、判定と更新を単一のDB処理で原子的に行う
  const { data: updatedDevice, error: updateError } = await supabase
    .from("devices")
    .update({ firmware_ver: firmwareVer })
    .eq("mac_address", macAddress)
    .neq("status", "revoked")
    .select("id, status")
    .maybeSingle()

  if (updateError) {
    console.error("Failed to update device:", updateError)
    return jsonResponse({ error: "Failed to update device" }, 500)
  }

  if (!updatedDevice) {
    // 更新条件（status<>'revoked'）に一致しなかった。revoked かどうかを確認して応答する
    const { data: currentDevice, error: recheckError } = await supabase
      .from("devices")
      .select("id, status")
      .eq("mac_address", macAddress)
      .maybeSingle()

    if (recheckError) {
      console.error("Failed to look up device:", recheckError)
      return jsonResponse({ error: "Failed to look up device" }, 500)
    }

    if (currentDevice?.status === "revoked") {
      return jsonResponse({ error: "Device is revoked" }, 403)
    }

    // 通常到達しない（呼び出し元でレコード存在を確認済み）が、削除等の競合に備えて明示的に扱う
    console.error("Device not found during enroll update:", { macAddress })
    return jsonResponse({ error: "Device not found" }, 404)
  }

  const device = updatedDevice as DeviceRow

  return jsonResponse({ status: device.status, device_id: device.id }, 200)
}
