import 'server-only'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export const ALERT_COUNT_TAG = 'alert-count'

export const getUnresolvedAlertCount = unstable_cache(
  async (): Promise<number> => {
    const supabase = await createClient()
    const { count } = await supabase
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .is('resolved_at', null)
    return count ?? 0
  },
  ['unresolved-alert-count'],
  { tags: [ALERT_COUNT_TAG] }
)
