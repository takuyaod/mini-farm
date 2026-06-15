'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

export type AddDeviceState = {
  success: boolean
  error?: string
}

export async function addDevice(
  _prev: AddDeviceState,
  formData: FormData
): Promise<AddDeviceState> {
  const user = await getUser()
  if (!user) return { success: false, error: '認証が必要です' }

  const zoneId = formData.get('zone_id') as string
  const name = (formData.get('name') as string | null)?.trim() || null
  const macAddress = (formData.get('mac_address') as string | null)?.trim()

  if (!macAddress) return { success: false, error: 'MACアドレスは必須です' }

  const supabase = await createClient()

  const { error } = await supabase.from('devices').insert({
    zone_id: zoneId || null,
    name,
    mac_address: macAddress,
    user_id: user.id,
  })

  if (error) return { success: false, error: 'デバイスの追加に失敗しました' }

  revalidatePath(`/zones/${zoneId}/settings`)
  return { success: true }
}
