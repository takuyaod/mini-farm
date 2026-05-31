'use client'

import { useRouter } from 'next/navigation'
import { WifiOff } from 'lucide-react'
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
  const plantName = currentPlant?.plants.name ?? '作付けなし'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/zones/${zone.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/zones/${zone.id}`)}
      className={`cursor-pointer rounded-xl bg-white ring-1 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-default ${
        alertCount > 0
          ? 'ring-alert-border border-l-[3px] border-l-alert-text'
          : 'ring-surface-border'
      }`}
    >
      <div className="p-4">
        {/* ヘッダー */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-content-primary">{zone.name}</h3>
            <Badge variant={zone.type === 'hydroponic' ? 'blue' : 'green'}>
              {zone.type === 'hydroponic' ? '水耕' : '土壌'}
            </Badge>
            {alertCount > 0 && (
              <Badge variant="red" className="gap-0.5">
                ⚠ {alertCount}件
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isOffline && (
              <Badge variant="secondary" className="gap-1 text-content-secondary">
                <WifiOff className="h-3 w-3" />
                オフライン
              </Badge>
            )}
            <span className="text-xs text-content-muted">{deviceCount}台</span>
          </div>
        </div>

        {/* センサータイル */}
        {displayedSensors.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {displayedSensors.map((sensor) => (
              <SensorTile key={sensor.id} sensor={sensor} isOffline={isOffline} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-content-muted">センサーなし</p>
        )}

        {/* アラート一覧 — クリックがカードナビゲーションに伝播しないよう止める */}
        <div onClick={(e) => e.stopPropagation()}>
          <AlertList
            alerts={unresolvedAlerts}
            sensors={sensorsWithReadings}
          />
        </div>

        {/* フッター */}
        <div className="mt-3 flex items-center justify-between border-t border-surface-muted pt-2.5 text-xs text-content-secondary">
          <span>{plantName}</span>
          <span>最終受信: {formatLastSeen(lastSeenAt)}</span>
        </div>
      </div>
    </div>
  )
}
