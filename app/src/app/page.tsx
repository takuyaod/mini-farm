import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Header } from '@/components/Header'
import { AlertBanner } from '@/features/dashboard/components/AlertBanner'
import { ZoneCard } from '@/features/dashboard/components/ZoneCard'
import { getDashboardData } from '@/features/dashboard/api/getDashboardData'

export default async function DashboardPage() {
  const { zones, totalUnresolvedAlerts } = await getDashboardData()

  return (
    <div className="min-h-screen bg-gray-50">
      <Header alertCount={totalUnresolvedAlerts} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        {zones.length > 0 && <AlertBanner zones={zones} />}
        <div
          className={`mt-4 ${
            zones.length === 1
              ? 'flex flex-col'
              : 'grid gap-4'
          }`}
          style={
            zones.length > 1
              ? { gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }
              : undefined
          }
        >
          {zones.map((zoneData) => (
            <ZoneCard key={zoneData.zone.id} data={zoneData} />
          ))}
        </div>
        <Link
          href="/zones/new"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-6 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-600"
        >
          <Plus className="h-4 w-4" />
          ゾーンを追加
        </Link>
      </main>
    </div>
  )
}
