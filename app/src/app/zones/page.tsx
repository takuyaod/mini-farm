import type { Metadata } from 'next'
import { Header } from '@/components/Header'
import { ZoneListSection } from '@/features/zones/components/ZoneListSection'
import { getZones } from '@/features/zones/api/getZones'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'ゾーン管理 | mini-farm',
  description: '全ゾーンの管理・操作',
}

async function getUnresolvedAlertCount(): Promise<number> {
  const supabase = await createClient()
  const { count } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .is('resolved_at', null)
  return count ?? 0
}

export default async function ZonesPage() {
  const [zonesData, totalUnresolvedAlerts] = await Promise.all([
    getZones(),
    getUnresolvedAlertCount(),
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header alertCount={totalUnresolvedAlerts} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            ゾーン管理
          </p>
          <p className="mt-0.5 text-sm text-gray-500">
            全ゾーンの管理・操作
          </p>
        </div>
        <ZoneListSection
          activeZones={zonesData.activeZones}
          inactiveZones={zonesData.inactiveZones}
        />
      </main>
    </div>
  )
}
