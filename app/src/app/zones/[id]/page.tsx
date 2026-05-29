import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Settings, AlertTriangle } from 'lucide-react'
import { Header } from '@/components/Header'
import { getZoneDetail } from '@/features/zones/api/getZoneDetail'
import { ZoneInfoCard } from '@/features/zones/components/ZoneInfoCard'
import { ZoneDetailClient } from '@/features/zones/components/ZoneDetailClient'
import { DeviceStatus } from '@/features/zones/components/DeviceStatus'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ZoneDetailPage({ params }: Props) {
  const { id } = await params
  const data = await getZoneDetail(id)

  if (!data) notFound()

  const { zone, devices, sensorsWithReadings, unresolvedAlerts, currentPlant, isOffline } = data
  const totalAlertCount = unresolvedAlerts.length

  return (
    <div className="min-h-screen bg-gray-50">
      <Header alertCount={totalAlertCount} />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        {/* ページヘッダー */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-1 rounded-md p-1 text-gray-500 hover:bg-gray-200"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">{zone.name}</h1>
          </div>
          <Link
            href={`/zones/${zone.id}/settings`}
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>

        {/* アラートバナー */}
        {totalAlertCount > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            <span className="flex-1 text-red-800">
              このゾーンに {totalAlertCount} 件の未解消アラートがあります
            </span>
            <Link href="/alerts" className="shrink-0 text-red-700 hover:underline">
              確認する →
            </Link>
          </div>
        )}

        {/* ゾーン情報カード */}
        <ZoneInfoCard
          zone={zone}
          currentPlant={currentPlant}
          unresolvedAlerts={unresolvedAlerts}
        />

        {/* センサー現況 + グラフ */}
        {sensorsWithReadings.length > 0 ? (
          <ZoneDetailClient sensors={sensorsWithReadings} isOffline={isOffline} />
        ) : (
          <div className="rounded-xl border bg-white p-6 text-center text-sm text-gray-400">
            センサーが登録されていません
          </div>
        )}

        {/* デバイス欄 */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-gray-500">デバイス</h2>
          <DeviceStatus devices={devices} />
        </section>
      </main>
    </div>
  )
}
