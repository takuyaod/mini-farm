'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

export type UpdateZoneNameState = {
  success: boolean
  error?: string
}

export async function updateZoneName(
  _prev: UpdateZoneNameState,
  formData: FormData
): Promise<UpdateZoneNameState> {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const zoneId = formData.get('zone_id') as string

  if (!name) return { success: false, error: 'ゾーン名を入力してください' }

  const user = await getUser()
  if (!user) return { success: false, error: '認証が必要です' }

  const supabase = await createClient()

  const { error } = await supabase
    .from('zones')
    .update({ name })
    .eq('id', zoneId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: 'ゾーン名の更新に失敗しました' }

  revalidatePath(`/zones/${zoneId}/settings`)
  revalidatePath(`/zones/${zoneId}`)
  revalidatePath('/')
  return { success: true }
}
