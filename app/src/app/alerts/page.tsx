import { Header } from '@/components/Header'
import { createClient } from '@/lib/supabase/server'
import { getAlerts } from '@/features/alerts/api/getAlerts'
import { AlertFilters } from '@/features/alerts/components/AlertFilters'

export default async function AlertsPage() {
  const supabase = await createClient()

  const [initialData, zonesResult] = await Promise.all([
    getAlerts({ tab: 'unresolved' }),
    supabase.from('zones').select('id, name').order('created_at', { ascending: true }),
  ])

  const zones = (zonesResult.data ?? []) as { id: string; name: string }[]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header alertCount={initialData.totalCount} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-6 text-xl font-bold text-gray-900">アラート</h1>
        <AlertFilters
          initialAlerts={initialData.alerts}
          initialTotalCount={initialData.totalCount}
          zones={zones}
        />
      </main>
    </div>
  )
}
