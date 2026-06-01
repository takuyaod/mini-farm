'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

export type DeactivateZoneState = {
  success: boolean
  error?: string
}

export async function deactivateZone(
  _prev: DeactivateZoneState,
  formData: FormData
): Promise<DeactivateZoneState> {
  const user = await getUser()
  if (!user) return { success: false, error: '認証が必要です' }

  const zoneId = formData.get('zone_id') as string | null
  if (!zoneId) return { success: false, error: '無効なリクエストです' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('zones')
    .update({ is_active: false })
    .eq('id', zoneId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: 'ゾーンの休止に失敗しました' }

  revalidatePath('/zones')
  revalidatePath(`/zones/${zoneId}/settings`)
  revalidatePath('/')
  return { success: true }
}
