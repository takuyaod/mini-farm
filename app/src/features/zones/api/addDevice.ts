'use server'

import { createClient, getUser } from '@/lib/supabase/server'

export type AddDeviceState = {
  success: boolean
  apiKey?: string
  error?: string
}

export async function addDevice(
  _prev: AddDeviceState,
  formData: FormData
): Promise<AddDeviceState> {
  const user = await getUser()
  if (!user) return { success: false, error: '認証が必要です' }

  const zoneId = formData.get('zone_id') as string
  const name = (formData.get('name') as string | null)?.trim() || null

  const rawKey = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')

  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawKey))
  const apiKeyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const supabase = await createClient()

  const { error } = await supabase.from('devices').insert({
    zone_id: zoneId,
    name,
    api_key_hash: apiKeyHash,
  })

  if (error) return { success: false, error: 'デバイスの追加に失敗しました' }

  return { success: true, apiKey: rawKey }
}
