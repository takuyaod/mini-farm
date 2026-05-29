'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

export type HarvestState = {
  success: boolean
  error?: string
}

export async function harvestZonePlant(
  _prev: HarvestState,
  formData: FormData
): Promise<HarvestState> {
  const user = await getUser()
  if (!user) return { success: false, error: '認証が必要です' }

  const zonePlantId = formData.get('zone_plant_id') as string
  const zoneId = formData.get('zone_id') as string
  const weightStr = formData.get('harvest_weight_g') as string
  const notes = formData.get('notes') as string

  const weightNum = parseFloat(weightStr)
  if (isNaN(weightNum) || weightNum < 0) {
    return { success: false, error: '収穫量は0以上の数値を入力してください' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('zone_plants')
    .update({
      harvested_at: new Date().toISOString(),
      harvest_weight_g: weightNum === 0 ? null : weightNum,
      notes: notes || null,
    })
    .eq('id', zonePlantId)

  if (error) return { success: false, error: '収穫の記録に失敗しました' }

  revalidatePath(`/zones/${zoneId}`)
  return { success: true }
}
