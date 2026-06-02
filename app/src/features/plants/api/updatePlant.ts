'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

export type UpdatePlantState = {
  success: boolean
  error?: string
}

export async function updatePlant(
  _prev: UpdatePlantState,
  formData: FormData
): Promise<UpdatePlantState> {
  const user = await getUser()
  if (!user) return { success: false, error: '認証エラーが発生しました' }

  const plantId = (formData.get('plant_id') as string | null)?.trim() ?? ''
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const cultivation_type = formData.get('cultivation_type') as string | null

  if (!plantId) return { success: false, error: '植物IDが指定されていません' }
  if (!name) return { success: false, error: '植物名を入力してください' }
  if (name.length > 100) return { success: false, error: '植物名は100文字以内で入力してください' }
  if (cultivation_type !== 'hydroponic' && cultivation_type !== 'soil' && cultivation_type !== 'both') {
    return { success: false, error: '栽培方式を選択してください' }
  }

  const supabase = await createClient()

  const { data: plant, error: plantError } = await supabase
    .from('plants')
    .select('id, created_by')
    .eq('id', plantId)
    .single()

  if (plantError) return { success: false, error: '植物の取得に失敗しました' }
  if (!plant) return { success: false, error: '植物が見つかりません' }
  if (plant.created_by === null) return { success: false, error: 'システム植物は変更できません' }
  if (plant.created_by !== user.id) return { success: false, error: 'この植物を変更する権限がありません' }

  const { error } = await supabase
    .from('plants')
    .update({ name, cultivation_type })
    .eq('id', plantId)
    .eq('created_by', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/plants')
  return { success: true }
}
