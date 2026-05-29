'use server'

import { createClient, getUser } from '@/lib/supabase/server'

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

  const rawKey = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')

  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey))
  const apiKeyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const supabase = await createClient()

  const { error } = await supabase
    .from('devices')
    .update({ api_key_hash: apiKeyHash })
    .eq('id', deviceId)

  if (error) return { success: false, error: 'APIキーの再発行に失敗しました' }

  return { success: true, apiKey: rawKey }
}
