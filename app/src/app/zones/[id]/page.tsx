import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Settings } from 'lucide-react'
import { Header } from '@/components/Header'
import { getZoneDetail } from '@/features/zones/api/getZoneDetail'
import { ZoneInfoCard } from '@/features/zones/components/ZoneInfoCard'
import { SensorSection } from '@/features/zones/components/SensorSection'
import { DeviceStatus } from '@/features/zones/components/DeviceStatus'
import { ZoneRealtimeProvider } from '@/features/zones/components/ZoneRealtimeProvider'

export default async function ZoneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getZoneDetail(id)

  if (!data) notFound()

  const { zone, devices, sensors, unresolvedAlerts, currentPlant, isOffline } = data

  const totalUnresolvedAlerts = unresolvedAlerts.length
  const sensorIds = sensors.map((s) => s.id)

  return (
    <div className="min-h-screen bg-gray-50">
      <ZoneRealtimeProvider sensorIds={sensorIds} channelKey={id} />
      <Header alertCount={totalUnresolvedAlerts} />
      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* ゾーンヘッダー */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-md p-1 text-gray-500 hover:bg-gray-200"
              aria-label="ホームへ戻る"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">{zone.name}</h1>
          </div>
          <Link
            href={`/zones/${zone.id}/settings`}
            className="rounded-md p-1 text-gray-500 hover:bg-gray-200"
            aria-label="ゾーン設定"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>

        {/* アラートバナー */}
        {unresolvedAlerts.length > 0 && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-medium">未解消アラート {unresolvedAlerts.length} 件</span>
          </div>
        )}

        <div className="space-y-4">
          {/* ゾーン情報カード */}
          <ZoneInfoCard
            zone={zone}
            currentPlant={currentPlant}
            unresolvedAlerts={unresolvedAlerts}
          />

          {/* センサー現況 + グラフ */}
          <SensorSection sensors={sensors} isOffline={isOffline} />

          {/* デバイス欄 */}
          <DeviceStatus devices={devices} />
        </div>
      </main>
    </div>
  )
}
