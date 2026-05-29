'use server'

import { createClient, getUser } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/generateApiKey'

export type ReissueApiKeyState = {
  success: boolean
  apiKey?: string
  error?: string
}

export async function reissueApiKey(
  _prev: ReissueApiKeyState,
  formData: FormData
): Promise<ReissueApiKeyState> {
  const user = await getUser()
  if (!user) return { success: false, error: '認証が必要です' }

  const deviceId = formData.get('device_id') as string

  const { rawKey, apiKeyHash } = await generateApiKey()

  const supabase = await createClient()

  const { error } = await supabase
    .from('devices')
    .update({ api_key_hash: apiKeyHash })
    .eq('id', deviceId)

  if (error) return { success: false, error: 'APIキーの再発行に失敗しました' }

  return { success: true, apiKey: rawKey }
}
