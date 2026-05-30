import { Header } from '@/components/Header'
import { AlertBanner } from '@/features/dashboard/components/AlertBanner'
import { ZoneCard } from '@/features/dashboard/components/ZoneCard'
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader'
import { DashboardRealtimeProvider } from '@/features/dashboard/components/DashboardRealtimeProvider'
import { getDashboardData } from '@/features/dashboard/api/getDashboardData'

export default async function DashboardPage() {
  const { zones, totalUnresolvedAlerts } = await getDashboardData()

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardRealtimeProvider />
      <Header alertCount={totalUnresolvedAlerts} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <DashboardHeader zoneCount={zones.length} />
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
      </main>
    </div>
  )
}
