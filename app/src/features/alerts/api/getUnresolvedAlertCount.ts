import 'server-only'
import { createClient } from '@/lib/supabase/server'

export async function getUnresolvedAlertCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .is('resolved_at', null)
  return count ?? 0
}
