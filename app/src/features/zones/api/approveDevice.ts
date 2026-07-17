'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'
import { isValidUuid, DEVICE_NAME_MAX_LENGTH } from '../utils'

export type ApproveDeviceState = {
  success: boolean
  error?: string
}

/**
 * pending デバイスをこのゾーンに承認する。
 * SCREEN_SPEC.md の `approveDevice` Server Action 仕様に従い、
 * WHERE に状態条件を含む単一の原子的 UPDATE のみで承認する（SELECT → UPDATE の2ステップは行わない）。
 */
export async function approveDevice(
  _prev: ApproveDeviceState,
  formData: FormData
): Promise<ApproveDeviceState> {
  const user = await getUser()
  if (!user) return { success: false, error: '認証が必要です' }

  const deviceId = formData.get('device_id') as string | null
  const zoneId = formData.get('zone_id') as string | null
  const name = (formData.get('name') as string | null)?.trim() || null

  if (!deviceId || !isValidUuid(deviceId)) {
    return { success: false, error: '無効なリクエストです' }
  }
  if (!zoneId || !isValidUuid(zoneId)) {
    return { success: false, error: '無効なリクエストです' }
  }
  if (name && name.length > DEVICE_NAME_MAX_LENGTH) {
    return { success: false, error: `デバイス名は${DEVICE_NAME_MAX_LENGTH}文字以内で入力してください` }
  }

  const supabase = await createClient()

  const { data: zone, error: zoneError } = await supabase
    .from('zones')
    .select('id')
    .eq('id', zoneId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (zoneError || !zone) {
    return { success: false, error: '指定されたゾーンが見つかりません' }
  }

  const { data, error } = await supabase
    .from('devices')
    .update({
      user_id: user.id,
      zone_id: zoneId,
      status: 'active',
      ...(name ? { name } : {}),
    })
    .eq('id', deviceId)
    .eq('status', 'pending')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .select('id')

  // pending 一覧はゾーン横断で共有されるため、失敗時も含めて全ゾーン設定ページを再検証する
  revalidatePath(`/zones/${zoneId}/settings`)
  revalidatePath('/zones/[id]/settings', 'layout')

  if (error || !data || data.length === 0) {
    return { success: false, error: '他のユーザーが既に承認済みです' }
  }

  return { success: true }
}
