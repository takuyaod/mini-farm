'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

export type DeletePlantState = {
  success: boolean
  error?: string
}

// zone_plants で使用中の植物を削除しようとしたときのユーザー向けメッセージ
const ZONE_PLANTS_IN_USE_ERROR =
  'この植物はゾーンで使用中のため削除できません。先にゾーンから植物を取り除いてください。'

// zone_plants.plant_id の FK 制約名（PostgreSQL の constraint name）
const ZONE_PLANTS_FK_CONSTRAINT = 'zone_plants_plant_id_fkey'

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

  // UX向上のための事前チェック: zone_plants に該当植物が存在する場合は早期リターンでわかりやすいエラーを返す。
  // ただし、このチェックと DELETE の間に race condition が発生し得るため、
  // 最終的な整合性は DB の FK 制約（zone_plants_plant_id_fkey）で担保する。
  const { data: inUse, error: zonePlantsError } = await supabase
    .from('zone_plants')
    .select('id')
    .eq('plant_id', plantId)
    .limit(1)
    .maybeSingle()

  if (zonePlantsError) return { success: false, error: '栽培状況の確認に失敗しました' }
  if (inUse !== null) {
    return { success: false, error: ZONE_PLANTS_IN_USE_ERROR }
  }

  const { error } = await supabase.from('plants').delete().eq('id', plantId)
  if (error) {
    // race condition により DELETE 直前に zone_plants へ挿入された場合のフォールバック。
    // 制約名で zone_plants_plant_id_fkey を特定し、他の FK 制約エラーと混同しない。
    if (error.code === '23503' && error.message.includes(ZONE_PLANTS_FK_CONSTRAINT)) {
      return { success: false, error: ZONE_PLANTS_IN_USE_ERROR }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/settings/plants')
  return { success: true }
}
