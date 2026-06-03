import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export const ALERT_COUNT_TAG = 'alert-count'

export const getUnresolvedAlertCount = cache(async (): Promise<number> => {
  const supabase = await createClient()
  const { count } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .is('resolved_at', null)
  return count ?? 0
})
