'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

export type AddDeviceState = {
  success: boolean
  error?: string
}

const MAC_ADDRESS_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/

export async function addDevice(
  _prev: AddDeviceState,
  formData: FormData
): Promise<AddDeviceState> {
  const user = await getUser()
  if (!user) return { success: false, error: '認証が必要です' }

  const zoneId = (formData.get('zone_id') as string | null)?.trim() || null
  const name = (formData.get('name') as string | null)?.trim() || null
  const macAddressRaw = (formData.get('mac_address') as string | null)?.trim()

  if (!macAddressRaw) return { success: false, error: 'MACアドレスは必須です' }

  if (!MAC_ADDRESS_REGEX.test(macAddressRaw)) {
    return { success: false, error: 'MACアドレスの形式が正しくありません（例: AA:BB:CC:DD:EE:FF）' }
  }

  // 大文字に正規化（DBのCHECK制約に合わせる）
  const macAddress = macAddressRaw.toUpperCase()

  if (!zoneId) return { success: false, error: 'ゾーンIDは必須です' }

  const supabase = await createClient()

  const { error } = await supabase.from('devices').insert({
    zone_id: zoneId,
    name,
    mac_address: macAddress,
    user_id: user.id,
  })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'そのMACアドレスはすでに登録されています' }
    }
    if (error.code === '42501') {
      return { success: false, error: '指定されたゾーンへのアクセス権がありません' }
    }
    return { success: false, error: 'デバイスの追加に失敗しました' }
  }

  revalidatePath(`/zones/${zoneId}/settings`)
  return { success: true }
}
