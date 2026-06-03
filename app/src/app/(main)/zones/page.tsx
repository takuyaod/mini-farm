import type { Metadata } from 'next'
import { ZoneListSection } from '@/features/zones/components/ZoneListSection'
import { getZones } from '@/features/zones/api/getZones'

export const metadata: Metadata = {
  title: 'ゾーン管理 | mini-farm',
  description: '全ゾーンの管理・操作',
}

export default async function ZonesPage() {
  const zonesData = await getZones()

  return (
    <div className="min-h-screen bg-gray-50">
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
