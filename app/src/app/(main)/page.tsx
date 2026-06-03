import { AlertBanner } from '@/features/dashboard/components/AlertBanner'
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader'
import { DashboardRealtimeProvider } from '@/features/dashboard/components/DashboardRealtimeProvider'
import { SummaryStrip } from '@/features/dashboard/components/SummaryStrip'
import { ZoneFilter } from '@/features/dashboard/components/ZoneFilter'
import { getDashboardData } from '@/features/dashboard/api/getDashboardData'

export default async function DashboardPage() {
  const { zones, summary } = await getDashboardData()
  const today = new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date())

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardRealtimeProvider />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <DashboardHeader zoneCount={zones.length} today={today} />
        {zones.length > 0 && <AlertBanner zones={zones} />}
        <div className="mt-4">
          <SummaryStrip summary={summary} />
        </div>
        <div className="mt-4">
          <ZoneFilter zones={zones} />
        </div>
      </main>
    </div>
  )
}
