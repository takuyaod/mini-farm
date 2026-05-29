'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

export type DecommissionSensorState = {
  success: boolean
  error?: string
}

export async function decommissionSensor(
  _prev: DecommissionSensorState,
  formData: FormData
): Promise<DecommissionSensorState> {
  const user = await getUser()
  if (!user) return { success: false, error: '認証が必要です' }

  const sensorId = formData.get('sensor_id') as string
  const zoneId = formData.get('zone_id') as string

  const supabase = await createClient()

  const { error } = await supabase
    .from('sensors')
    .update({
      is_active: false,
      decommissioned_at: new Date().toISOString(),
    })
    .eq('id', sensorId)

  if (error) return { success: false, error: 'センサーの削除に失敗しました' }

  revalidatePath(`/zones/${zoneId}`)
  revalidatePath(`/zones/${zoneId}/settings`)
  return { success: true }
}
