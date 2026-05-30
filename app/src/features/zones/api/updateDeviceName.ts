'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

export type UpdateDeviceNameState = {
  success: boolean
  error?: string
}

export async function updateDeviceName(
  _prev: UpdateDeviceNameState,
  formData: FormData
): Promise<UpdateDeviceNameState> {
  const user = await getUser()
  if (!user) return { success: false, error: '認証が必要です' }

  const deviceId = formData.get('device_id') as string | null
  const zoneId = formData.get('zone_id') as string | null
  const name = (formData.get('name') as string | null)?.trim() || null

  if (!deviceId) return { success: false, error: '無効なリクエストです' }
  if (!zoneId) return { success: false, error: '無効なリクエストです' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('devices')
    .update({ name })
    .eq('id', deviceId)
    .eq('zone_id', zoneId)

  if (error) return { success: false, error: 'デバイス名の更新に失敗しました' }

  revalidatePath(`/zones/${zoneId}/settings`)
  return { success: true }
}
