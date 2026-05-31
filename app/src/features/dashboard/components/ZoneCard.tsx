'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle, ChevronRight, Clock, Cpu, Droplets, Leaf, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { SensorTile } from './SensorTile'
import { AlertList } from './AlertList'
import type { ZoneCardData } from '../types'

type Props = {
  data: ZoneCardData
}

function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) return '受信なし'
  const diff = Date.now() - new Date(lastSeenAt).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'たった今'
  if (mins < 60) return `${mins}分前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}時間前`
  return `${Math.floor(hours / 24)}日前`
}

export function ZoneCard({ data }: Props) {
  const router = useRouter()
  const { zone, devices, sensorsWithReadings, unresolvedAlerts, currentPlant, isOffline, lastSeenAt } = data

  const deviceCount = devices.length
  const alertCount = unresolvedAlerts.length
  const displayedSensors = sensorsWithReadings.slice(0, 3)
  const plantName = currentPlant?.plants.name ?? null

  const alertBySensorId = Object.fromEntries(unresolvedAlerts.map((a) => [a.sensor_id, a]))

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/zones/${zone.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/zones/${zone.id}`)}
      className={`cursor-pointer rounded-xl bg-white ring-1 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-default ${
        alertCount > 0
          ? 'border-l-4 border-l-alert-text ring-alert-border'
          : 'ring-surface-border'
      }`}
    >
      <div className="p-4">
        {/* ヘッダー: ゾーン名 + アラート件数バッジ | シェブロン */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate font-semibold text-content-primary">{zone.name}</h3>
            {alertCount > 0 && (
              <span className="flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-alert-text px-1 text-[11px] font-bold text-white">
                {alertCount}
              </span>
            )}
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" />
        </div>

        {/* サブヘッダー: ゾーン種別 + 台数 + 植物名 */}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-content-secondary">
          <Badge
            variant={zone.type === 'hydroponic' ? 'blue' : 'green'}
            className="shrink-0 gap-1"
          >
            {zone.type === 'hydroponic' ? (
              <>
                <Droplets className="h-3 w-3" />
                水耕
              </>
            ) : (
              <>
                <Leaf className="h-3 w-3" />
                土耕
              </>
            )}
          </Badge>
          <span className="flex shrink-0 items-center gap-0.5 text-content-secondary">
            <Cpu className="h-3 w-3 text-content-muted" />
            {deviceCount}台
          </span>
          {plantName && <span className="text-content-secondary">・{plantName}</span>}
          {isOffline && (
            <Badge variant="secondary" className="ml-auto shrink-0 gap-1 text-content-muted">
              <WifiOff className="h-3 w-3" />
              オフライン
            </Badge>
          )}
        </div>

        {/* センサータイル */}
        {displayedSensors.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {displayedSensors.map((sensor) => (
              <SensorTile
                key={sensor.id}
                sensor={sensor}
                isOffline={isOffline}
                breachDirection={alertBySensorId[sensor.id]?.breach_direction ?? null}
              />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-content-muted">センサーなし</p>
        )}

        {/* アラート一覧 */}
        {alertCount > 0 && (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 flex items-center gap-1 text-xs font-medium text-alert-text">
              <AlertTriangle className="h-3 w-3" />
              未解消アラート
            </p>
            <AlertList alerts={unresolvedAlerts} sensors={sensorsWithReadings} />
          </div>
        )}

        {/* フッター */}
        <div className="mt-3 flex items-center justify-between border-t border-surface-muted pt-2.5 text-xs text-content-secondary">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-content-muted" />
            最終受信 {formatLastSeen(lastSeenAt)}
          </span>
          <span className="font-medium text-content-secondary">詳細を開く →</span>
        </div>
      </div>
    </div>
  )
}
