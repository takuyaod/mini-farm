'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient, getUser } from '@/lib/supabase/server'
import { ALERT_COUNT_TAG } from '@/features/alerts/api/getUnresolvedAlertCount'

export async function resolveAlert(alertId: string) {
  const user = await getUser()
  if (!user) throw new Error('Unauthorized')

  const supabase = await createClient()
  const { error } = await supabase
    .from('alerts')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', alertId)

  if (error) throw new Error(error.message)

  revalidateTag(ALERT_COUNT_TAG, 'max')
  revalidatePath('/')
}
