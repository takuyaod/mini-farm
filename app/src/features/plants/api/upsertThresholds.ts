'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

export type UpsertThresholdsState = {
  success: boolean
  error?: string
}

export async function upsertThresholds(
  _prev: UpsertThresholdsState,
  formData: FormData
): Promise<UpsertThresholdsState> {
  const plantId = formData.get('plant_id') as string | null
  if (!plantId) return { success: false, error: '植物が選択されていません' }

  const user = await getUser()
  if (!user) return { success: false, error: '認証エラーが発生しました' }

  const supabase = await createClient()
  const { data: plant, error: plantError } = await supabase
    .from('plants')
    .select('id, created_by')
    .eq('id', plantId)
    .single()

  if (plantError) {
    console.error('[upsertThresholds] plant fetch error:', plantError)
    return { success: false, error: '植物の取得に失敗しました' }
  }
  if (!plant) return { success: false, error: '植物が見つかりません' }
  if (plant.created_by === null) return { success: false, error: 'システム植物の閾値は編集できません' }
  if (plant.created_by !== user.id) return { success: false, error: 'この植物の閾値を編集する権限がありません' }

  const sensorTypeIds = formData.getAll('sensor_type_id') as string[]
  if (sensorTypeIds.length === 0) return { success: true }

  const parseNum = (val: FormDataEntryValue | null): number | null => {
    if (!val || val === '') return null
    const n = parseFloat(val as string)
    return isNaN(n) ? null : n
  }

  const records = sensorTypeIds.map((sensorTypeId) => ({
    plant_id: plantId,
    sensor_type_id: sensorTypeId,
    optimal_min: parseNum(formData.get(`optimal_min_${sensorTypeId}`)),
    optimal_max: parseNum(formData.get(`optimal_max_${sensorTypeId}`)),
    alert_min: parseNum(formData.get(`alert_min_${sensorTypeId}`)),
    alert_max: parseNum(formData.get(`alert_max_${sensorTypeId}`)),
  }))

  const { error } = await supabase
    .from('plant_thresholds')
    .upsert(records, { onConflict: 'plant_id,sensor_type_id' })

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/plants')
  return { success: true }
}
