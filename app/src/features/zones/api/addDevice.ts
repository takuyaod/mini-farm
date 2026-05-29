'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/generateApiKey'

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

  const { rawKey, apiKeyHash } = await generateApiKey()

  const supabase = await createClient()

  const { error } = await supabase.from('devices').insert({
    zone_id: zoneId,
    name,
    api_key_hash: apiKeyHash,
  })

  if (error) return { success: false, error: 'デバイスの追加に失敗しました' }

  revalidatePath(`/zones/${zoneId}/settings`)
  return { success: true, apiKey: rawKey }
}
