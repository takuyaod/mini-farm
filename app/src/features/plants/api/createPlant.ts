'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

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

  if (!name) return { success: false, error: '植物名を入力してください' }
  if (cultivation_type !== 'hydroponic' && cultivation_type !== 'soil' && cultivation_type !== 'both') {
    return { success: false, error: '栽培方式を選択してください' }
  }

  const user = await getUser()
  if (!user) return { success: false, error: '認証エラーが発生しました' }

  const supabase = await createClient()
  const { error } = await supabase.from('plants').insert({ name, cultivation_type })

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/plants')
  return { success: true }
}
