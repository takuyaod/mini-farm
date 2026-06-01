'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

export type ActivateZoneState = {
  success: boolean
  error?: string
}

export async function activateZone(
  _prev: ActivateZoneState,
  formData: FormData
): Promise<ActivateZoneState> {
  const user = await getUser()
  if (!user) return { success: false, error: '認証が必要です' }

  const zoneId = formData.get('zone_id') as string | null
  if (!zoneId) return { success: false, error: '無効なリクエストです' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('zones')
    .update({ is_active: true })
    .eq('id', zoneId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: 'ゾーンの再開に失敗しました' }

  revalidatePath('/zones')
  revalidatePath(`/zones/${zoneId}/settings`)
  revalidatePath('/')
  return { success: true }
}
