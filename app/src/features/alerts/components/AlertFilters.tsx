'use client'

import { useOptimistic, useTransition, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
      {/* タブ */}
      <Tabs value={tab} onValueChange={(v) => handleTabChange(v as 'unresolved' | 'resolved')}>
        <TabsList
          className="mb-4 gap-1 rounded-xl border-[#e6e9e5] bg-[#eef1ed] p-1"
          style={{ boxShadow: 'none' }}
        >
          <TabsTrigger
            value="unresolved"
            className="flex-1 gap-2 rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-[#0f1a14] data-[state=inactive]:text-[#4b5a52] data-[state=inactive]:hover:text-[#0f1a14]"
            style={{
              boxShadow: undefined,
            }}
          >
            未解消
            {unresolvedCount !== undefined && unresolvedCount > 0 && (
              <span
                className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 font-mono text-[10px] font-bold tabular-nums text-white"
                style={{ backgroundColor: '#d6452c' }}
              >
                {unresolvedCount}
              </span>
            )}
            {unresolvedCount === 0 && (
              <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#cdd3cb] px-1 font-mono text-[10px] tabular-nums text-[#4b5a52]">
                0
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="resolved"
            className="flex-1 gap-2 rounded-lg px-4 py-1.5 text-[13px] font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-[#0f1a14] data-[state=inactive]:text-[#4b5a52] data-[state=inactive]:hover:text-[#0f1a14]"
          >
            解消済み
            {resolvedCount !== undefined && (
              <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#cdd3cb] px-1 font-mono text-[10px] tabular-nums text-[#4b5a52]">
                {resolvedCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="unresolved" className="mt-0">
          {ZoneFilterButtons}

          {/* アラート一覧 */}
          <div className={`space-y-3 ${isPending ? 'opacity-60' : ''}`}>
            {optimisticAlerts.length === 0 ? (
              <p className="py-12 text-center text-[13px] text-[#8a978f]">
                未解消のアラートはありません
              </p>
            ) : (
              optimisticAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onResolve={handleResolve}
                />
              ))
            )}
          </div>

          {LoadMoreSection}
        </TabsContent>

        <TabsContent value="resolved" className="mt-0">
          {ZoneFilterButtons}

          {/* アラート一覧 */}
          <div className={`space-y-3 ${isPending ? 'opacity-60' : ''}`}>
            {optimisticAlerts.length === 0 ? (
              <p className="py-12 text-center text-[13px] text-[#8a978f]">
                解消済みのアラートはありません
              </p>
            ) : (
              optimisticAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                />
              ))
            )}
          </div>

          {LoadMoreSection}
        </TabsContent>
      </Tabs>
    </div>
  )
}
