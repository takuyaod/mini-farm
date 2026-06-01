'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

export type DeletePlantState = {
  success: boolean
  error?: string
}

export async function deletePlant(
  _prev: DeletePlantState,
  formData: FormData
): Promise<DeletePlantState> {
  const plantId = (formData.get('plant_id') as string | null)?.trim() ?? ''
  if (!plantId) return { success: false, error: '植物IDが指定されていません' }

  const user = await getUser()
  if (!user) return { success: false, error: '認証エラーが発生しました' }

  const supabase = await createClient()

  const { data: plant, error: plantError } = await supabase
    .from('plants')
    .select('id, created_by')
    .eq('id', plantId)
    .single()

  if (plantError) return { success: false, error: '植物の取得に失敗しました' }
  if (!plant) return { success: false, error: '植物が見つかりません' }
  if (plant.created_by === null) return { success: false, error: 'システム植物は削除できません' }
  if (plant.created_by !== user.id) return { success: false, error: 'この植物を削除する権限がありません' }

  const { error } = await supabase.from('plants').delete().eq('id', plantId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/plants')
  return { success: true }
}
