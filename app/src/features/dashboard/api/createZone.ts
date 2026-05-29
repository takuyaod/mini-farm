'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'

export type CreateZoneState = {
  success: boolean
  error?: string
}

export async function createZone(
  _prev: CreateZoneState,
  formData: FormData
): Promise<CreateZoneState> {
  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const type = formData.get('type') as 'hydroponic' | 'soil' | null

  if (!name) return { success: false, error: 'ゾーン名を入力してください' }
  if (type !== 'hydroponic' && type !== 'soil') {
    return { success: false, error: '栽培方式を選択してください' }
  }

  const user = await getUser()
  if (!user) return { success: false, error: '認証エラーが発生しました' }

  const supabase = await createClient()
  const { error } = await supabase.from('zones').insert({ name, type, user_id: user.id })

  if (error) return { success: false, error: error.message }

  revalidatePath('/')
  return { success: true }
}
