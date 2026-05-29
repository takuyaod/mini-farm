'use client'

import { useOptimistic, useTransition, useState } from 'react'
import { AlertCard } from './AlertCard'
import { getAlerts } from '../api/getAlerts'
import { resolveAlert } from '../api/resolveAlert'
import type { AlertWithContext } from '../types'

type Zone = { id: string; name: string }

type Props = {
  initialAlerts: AlertWithContext[]
  initialTotalCount: number
  zones: Zone[]
}

const ZONE_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
]

function getZoneColor(zoneId: string): string {
  let hash = 0
  for (let i = 0; i < zoneId.length; i++) {
    hash = (hash * 31 + zoneId.charCodeAt(i)) | 0
  }
  return ZONE_COLORS[Math.abs(hash) % ZONE_COLORS.length]
}

export function AlertFilters({ initialAlerts, initialTotalCount, zones }: Props) {
  const [tab, setTab] = useState<'unresolved' | 'resolved'>('unresolved')
  const [zoneId, setZoneId] = useState<string | undefined>(undefined)
  const [displayedAlerts, setDisplayedAlerts] = useState<AlertWithContext[]>(initialAlerts)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [isPending, startTransition] = useTransition()

  const [optimisticAlerts, removeAlert] = useOptimistic(
    displayedAlerts,
    (current: AlertWithContext[], alertId: string) => current.filter((a) => a.id !== alertId)
  )

  const remainingCount = Math.max(0, totalCount - displayedAlerts.length)
  const lastAlert = displayedAlerts[displayedAlerts.length - 1]

  function handleTabChange(newTab: 'unresolved' | 'resolved') {
    if (newTab === tab) return
    setTab(newTab)
    startTransition(async () => {
      const result = await getAlerts({ tab: newTab, zoneId })
      setDisplayedAlerts(result.alerts)
      setTotalCount(result.totalCount)
    })
  }

  function handleZoneChange(newZoneId: string | undefined) {
    if (newZoneId === zoneId) return
    setZoneId(newZoneId)
    startTransition(async () => {
      const result = await getAlerts({ tab, zoneId: newZoneId })
      setDisplayedAlerts(result.alerts)
      setTotalCount(result.totalCount)
    })
  }

  function handleLoadMore() {
    if (!lastAlert) return
    startTransition(async () => {
      const result = await getAlerts({
        tab,
        zoneId,
        cursor: { started_at: lastAlert.started_at, id: lastAlert.id },
      })
      setDisplayedAlerts((prev) => [...prev, ...result.alerts])
      setTotalCount(result.totalCount)
    })
  }

  function handleResolve(alertId: string) {
    startTransition(async () => {
      removeAlert(alertId)
      try {
        await resolveAlert(alertId)
        setDisplayedAlerts((prev) => prev.filter((a) => a.id !== alertId))
        setTotalCount((prev) => Math.max(0, prev - 1))
      } catch {
        // サーバーエラー時は楽観的更新が巻き戻る（useOptimistic の仕様）
      }
    })
  }

  const unresolvedCount = tab === 'unresolved' ? totalCount : undefined
  const resolvedCount = tab === 'resolved' ? totalCount : undefined

  return (
    <div className="space-y-4">
      {/* タブ */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
        <button
          onClick={() => handleTabChange('unresolved')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'unresolved'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          未解消
          {unresolvedCount !== undefined && unresolvedCount > 0 && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
              {unresolvedCount}
            </span>
          )}
          {unresolvedCount === 0 && (
            <span className="rounded-full bg-gray-300 px-1.5 py-0.5 text-xs text-gray-600">
              0
            </span>
          )}
        </button>
        <button
          onClick={() => handleTabChange('resolved')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'resolved'
              ? 'bg-gray-900 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          解消済み
          {resolvedCount !== undefined && (
            <span className="rounded-full bg-gray-400 px-1.5 py-0.5 text-xs text-gray-100">
              {resolvedCount}
            </span>
          )}
        </button>
      </div>

      {/* ゾーン絞り込み */}
      {zones.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleZoneChange(undefined)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              zoneId === undefined
                ? 'bg-gray-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            すべて
          </button>
          {zones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => handleZoneChange(zone.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                zoneId === zone.id
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: getZoneColor(zone.id) }}
              />
              {zone.name}
            </button>
          ))}
        </div>
      )}

      {/* アラート一覧 */}
      <div className={`space-y-3 ${isPending ? 'opacity-60' : ''}`}>
        {optimisticAlerts.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            {tab === 'unresolved' ? '未解消のアラートはありません' : '解消済みのアラートはありません'}
          </p>
        ) : (
          optimisticAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onResolve={tab === 'unresolved' ? handleResolve : undefined}
            />
          ))
        )}
      </div>

      {/* もっと見る */}
      {optimisticAlerts.length > 0 && (
        <div className="text-center">
          {remainingCount > 0 ? (
            <button
              onClick={handleLoadMore}
              disabled={isPending}
              className="rounded-md border border-gray-200 bg-white px-6 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              さらに読み込む（残り {remainingCount}件）
            </button>
          ) : (
            displayedAlerts.length > 0 && (
              <p className="text-sm text-gray-400">すべて表示しました</p>
            )
          )}
        </div>
      )}
    </div>
  )
}
