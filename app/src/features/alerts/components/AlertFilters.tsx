'use client'

import { useOptimistic, useTransition, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCard } from './AlertCard'
import { getAlerts } from '../api/getAlerts'
import { resolveAlert } from '../api/resolveAlert'
import type { AlertWithContext, AlertTypeFilter } from '../types'

type Zone = { id: string; name: string }

type Props = {
  initialAlerts: AlertWithContext[]
  initialTotalCount: number
  zones: Zone[]
}

const TYPE_FILTER_OPTIONS: { value: AlertTypeFilter; label: string }[] = [
  { value: 'all', label: '全種別' },
  { value: 'high', label: '上限超過' },
  { value: 'low', label: '下限割れ' },
  { value: 'sensor_fault', label: 'センサー異常' },
]

const ZONE_COLORS = [
  '#246e3a',
  '#1f6fd1',
  '#b1740a',
  '#b9351f',
  '#8b5cf6',
  '#0891b2',
  '#be185d',
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
  const [typeFilter, setTypeFilter] = useState<AlertTypeFilter>('all')
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
      const result = await getAlerts({ tab: newTab, zoneId, typeFilter })
      setDisplayedAlerts(result.alerts)
      setTotalCount(result.totalCount)
    })
  }

  function handleZoneChange(newZoneId: string | undefined) {
    if (newZoneId === zoneId) return
    setZoneId(newZoneId)
    startTransition(async () => {
      const result = await getAlerts({ tab, zoneId: newZoneId, typeFilter })
      setDisplayedAlerts(result.alerts)
      setTotalCount(result.totalCount)
    })
  }

  function handleTypeFilterChange(newFilter: AlertTypeFilter) {
    if (newFilter === typeFilter) return
    setTypeFilter(newFilter)
    startTransition(async () => {
      const result = await getAlerts({ tab, zoneId, typeFilter: newFilter })
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
        typeFilter,
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

  /* ゾーン絞り込みボタン（共通） */
  const ZoneFilterButtons = (
    <>
      {zones.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => handleZoneChange(undefined)}
            className={`inline-flex items-center rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${
              zoneId === undefined
                ? 'bg-[#0f1a14] text-white'
                : 'bg-white text-[#4b5a52] ring-1 ring-[#e6e9e5] hover:bg-surface-muted hover:text-[#0f1a14]'
            }`}
          >
            すべて
          </button>
          {zones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => handleZoneChange(zone.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors ${
                zoneId === zone.id
                  ? 'bg-[#0f1a14] text-white'
                  : 'bg-white text-[#4b5a52] ring-1 ring-[#e6e9e5] hover:bg-surface-muted hover:text-[#0f1a14]'
              }`}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: getZoneColor(zone.id) }}
              />
              {zone.name}
            </button>
          ))}
        </div>
      )}
    </>
  )

  /* もっと見る（共通） */
  const LoadMoreSection = (
    <>
      {optimisticAlerts.length > 0 && (
        <div className="mt-4 text-center">
          {remainingCount > 0 ? (
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={isPending}
              className="border-[#e6e9e5] text-[#4b5a52] hover:border-[#cdd3cb] hover:bg-surface-muted hover:text-[#0f1a14]"
            >
              さらに読み込む（残り {remainingCount}件）
            </Button>
          ) : (
            displayedAlerts.length > 0 && (
              <p className="text-[12.5px] text-[#8a978f]">すべて表示しました</p>
            )
          )}
        </div>
      )}
    </>
  )

  return (
    <div className="space-y-4">
      {/* タブバー（アンダーライン型） + 種別フィルター */}
      <div
        className="flex items-center justify-between border-b"
        style={{ borderColor: '#e6e9e5' }}
      >
        {/* アンダーライン型タブ */}
        <div className="flex">
          {(
            [
              { value: 'unresolved', label: '未解消', count: unresolvedCount },
              { value: 'resolved', label: '解消済み', count: resolvedCount },
            ] as const
          ).map(({ value, label, count }) => (
            <button
              key={value}
              onClick={() => handleTabChange(value)}
              className="relative flex items-center gap-2 px-4 pb-3 pt-1 text-[13px] font-medium transition-colors"
              style={{
                color: tab === value ? '#0f1a14' : '#4b5a52',
              }}
            >
              {label}
              {count !== undefined && (
                <span
                  className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold tabular-nums"
                  style={
                    value === 'unresolved' && count > 0
                      ? { backgroundColor: '#d6452c', color: '#fff' }
                      : { backgroundColor: '#eef1ed', color: '#4b5a52' }
                  }
                >
                  {count}
                </span>
              )}
              {/* アクティブアンダーライン */}
              {tab === value && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  style={{ backgroundColor: '#0f1a14' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* 種別フィルターボタン群 */}
        <div className="flex items-center gap-1 pb-2">
          {TYPE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleTypeFilterChange(opt.value)}
              className="inline-flex items-center rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors"
              style={
                typeFilter === opt.value
                  ? { backgroundColor: '#0f1a14', color: '#fff' }
                  : {
                      backgroundColor: 'transparent',
                      color: '#4b5a52',
                      border: '1px solid #e6e9e5',
                    }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* タブコンテンツ */}
      <div>
        {ZoneFilterButtons}

        {/* アラート一覧 */}
        <div className={`space-y-3 ${isPending ? 'opacity-60' : ''}`}>
          {optimisticAlerts.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-[#8a978f]">
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

        {LoadMoreSection}
      </div>
    </div>
  )
}
