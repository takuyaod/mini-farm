'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'
import { isValidUuid } from '../utils'

export type RevokeDeviceState = {
  success: boolean
  error?: string
}

/**
 * 登録済み（active）デバイスを無効化（revoked）する。
 * SCREEN_SPEC.md の `revokeDevice` Server Action 仕様に従い、
 * WHERE に状態条件を含む単一の原子的 UPDATE のみで無効化する。
 */
export async function revokeDevice(
  _prev: RevokeDeviceState,
  formData: FormData
): Promise<RevokeDeviceState> {
  const user = await getUser()
  if (!user) return { success: false, error: '認証が必要です' }

  const deviceId = formData.get('device_id') as string | null
  const zoneId = formData.get('zone_id') as string | null

  if (!deviceId || !isValidUuid(deviceId)) {
    return { success: false, error: '無効なリクエストです' }
  }
  if (!zoneId || !isValidUuid(zoneId)) {
    return { success: false, error: '無効なリクエストです' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('devices')
    .update({ status: 'revoked' })
    .eq('id', deviceId)
    .eq('status', 'active')
    .eq('user_id', user.id)
    .select('id')

  if (error || !data || data.length === 0) {
    return { success: false, error: 'デバイスの無効化に失敗しました' }
  }

  revalidatePath(`/zones/${zoneId}/settings`)
  return { success: true }
}
