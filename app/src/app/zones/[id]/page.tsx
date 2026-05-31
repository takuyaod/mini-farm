import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ChevronLeft, Settings, Share2 } from 'lucide-react'
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
    <div className="min-h-screen bg-surface-bg">
      <ZoneRealtimeProvider sensorIds={sensorIds} channelKey={id} />
      <Header alertCount={totalUnresolvedAlerts} />
      <main className="mx-auto max-w-[1400px] px-8 py-7">
        {/* ページヘッダー: パンくず + 共有/設定 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12.5px] font-medium text-content-secondary hover:bg-surface-muted hover:text-content-primary"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              戻る
            </Link>
            <nav className="flex items-center gap-1.5 text-[12.5px] text-content-secondary">
              <Link href="/" className="hover:text-content-primary">
                ダッシュボード
              </Link>
              <span>/</span>
              <span className="text-content-secondary">ゾーン</span>
              <span>/</span>
              <span className="font-medium text-content-primary">{zone.name}</span>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-content-secondary hover:bg-surface-muted hover:text-content-primary">
              <Share2 className="h-3.5 w-3.5" />
              共有
            </button>
            <Link
              href={`/zones/${zone.id}/settings`}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-content-primary ring-1 ring-surface-border hover:bg-surface-muted"
            >
              <Settings className="h-3.5 w-3.5" />
              設定
            </Link>
          </div>
        </div>

        {/* アラートバナー */}
        {unresolvedAlerts.length > 0 && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-[#f6d8d3] bg-gradient-to-r from-[#fdecea] to-[#fdf3e2] px-4 py-2.5">
            <AlertTriangle className="h-[15px] w-[15px] shrink-0 text-[#b9351f]" />
            <span className="text-[12.5px] text-[#5a2316]">
              このゾーンに{' '}
              <span className="font-semibold tabular-nums text-[#b9351f]">
                {unresolvedAlerts.length} 件
              </span>
              {' '}の未解消アラートがあります —{' '}
              {unresolvedAlerts.map((alert, i) => {
                const sensor = sensors.find((s) => s.id === alert.sensor_id)
                const name = sensor?.label ?? sensor?.sensor_type_masters.label ?? 'センサー'
                const direction =
                  alert.breach_direction === 'high'
                    ? '上限超過'
                    : alert.breach_direction === 'low'
                      ? '下限割れ'
                      : 'アラート中'
                return (
                  <span key={alert.id}>
                    <span className="font-semibold">{name}</span>
                    <span className="text-[#83372a]">（{direction}）</span>
                    {i < unresolvedAlerts.length - 1 && (
                      <span className="text-[#c2837a]">, </span>
                    )}
                  </span>
                )
              })}
            </span>
            <Link
              href="/alerts"
              className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-[#b9351f] hover:underline"
            >
              確認 →
            </Link>
          </div>
        )}

        <div className="mt-6 space-y-6">
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
