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

  const supabase = await createClient()
  const { error } = await supabase
    .from('plant_thresholds')
    .upsert(records, { onConflict: 'plant_id,sensor_type_id' })

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/plants')
  return { success: true }
}
