'use client'

import { useRouter } from 'next/navigation'
import { WifiOff } from 'lucide-react'
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
      className={`cursor-pointer rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        alertCount > 0 ? 'border-l-[3px] border-l-red-500' : ''
      }`}
    >
      <div className="p-4">
        {/* ヘッダー */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{zone.name}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                zone.type === 'hydroponic'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {zone.type === 'hydroponic' ? '水耕' : '土壌'}
            </span>
            {alertCount > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                ⚠ {alertCount}件
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isOffline && (
              <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                <WifiOff className="h-3 w-3" />
                オフライン
              </span>
            )}
            <span className="text-xs text-gray-400">{deviceCount}台</span>
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
          <p className="mt-3 text-sm text-gray-400">センサーなし</p>
        )}

        {/* アラート一覧 — クリックがカードナビゲーションに伝播しないよう止める */}
        <div onClick={(e) => e.stopPropagation()}>
          <AlertList
            alerts={unresolvedAlerts}
            sensors={sensorsWithReadings}
          />
        </div>

        {/* フッター */}
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>{plantName}</span>
          <span>最終受信: {formatLastSeen(lastSeenAt)}</span>
        </div>
      </div>
    </div>
  )
}
