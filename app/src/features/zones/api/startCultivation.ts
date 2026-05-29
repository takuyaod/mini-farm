'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

export type StartCultivationState = {
  success: boolean
  error?: string
}

export async function startCultivation(
  _prev: StartCultivationState,
  formData: FormData
): Promise<StartCultivationState> {
  const user = await getUser()
  if (!user) return { success: false, error: '認証が必要です' }

  const zoneId = formData.get('zone_id') as string
  const plantId = formData.get('plant_id') as string
  const plantedAt = formData.get('planted_at') as string

  if (!plantId) return { success: false, error: '植物を選択してください' }
  if (!plantedAt) return { success: false, error: '植付日を入力してください' }

  const supabase = await createClient()

  const { error } = await supabase.from('zone_plants').insert({
    zone_id: zoneId,
    plant_id: plantId,
    planted_at: new Date(plantedAt).toISOString(),
  })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'このゾーンにはすでに栽培中の植物があります' }
    }
    return { success: false, error: '作付けの開始に失敗しました' }
  }

  revalidatePath(`/zones/${zoneId}`)
  revalidatePath(`/zones/${zoneId}/settings`)
  return { success: true }
}
