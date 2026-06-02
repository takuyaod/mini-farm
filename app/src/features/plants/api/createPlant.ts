'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'
import { validatePlantFields } from './validatePlantFields'

export type CreatePlantState = {
  success: boolean
  error?: string
}

export async function createPlant(
  _prev: CreatePlantState,
  formData: FormData
): Promise<CreatePlantState> {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const cultivation_type = formData.get('cultivation_type') as string | null

  const fieldError = validatePlantFields(name, cultivation_type)
  if (fieldError) return { success: false, error: fieldError }

  const user = await getUser()
  if (!user) return { success: false, error: '認証エラーが発生しました' }

  const supabase = await createClient()
  const { error } = await supabase.from('plants').insert({ name, cultivation_type, created_by: user.id })

  if (error) {
    console.error('[createPlant] insert error:', error)
    return { success: false, error: '植物の作成に失敗しました' }
  }

  revalidatePath('/settings/plants')
  return { success: true }
}
