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
      <Tabs value={tab} onValueChange={(v) => handleTabChange(v as 'unresolved' | 'resolved')}>
        <TabsList className="w-full">
          <TabsTrigger value="unresolved" className="flex-1">
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
          </TabsTrigger>
          <TabsTrigger value="resolved" className="flex-1">
            解消済み
            {resolvedCount !== undefined && (
              <span className="rounded-full bg-gray-400 px-1.5 py-0.5 text-xs text-gray-100">
                {resolvedCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="unresolved" className="mt-0">
          {/* ゾーン絞り込み */}
          {zones.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                variant={zoneId === undefined ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleZoneChange(undefined)}
                className="rounded-full"
              >
                すべて
              </Button>
              {zones.map((zone) => (
                <Button
                  key={zone.id}
                  variant={zoneId === zone.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleZoneChange(zone.id)}
                  className="rounded-full"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: getZoneColor(zone.id) }}
                  />
                  {zone.name}
                </Button>
              ))}
            </div>
          )}

          {/* アラート一覧 */}
          <div className={`space-y-3 ${isPending ? 'opacity-60' : ''}`}>
            {optimisticAlerts.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
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

          {/* もっと見る */}
          {optimisticAlerts.length > 0 && (
            <div className="mt-4 text-center">
              {remainingCount > 0 ? (
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isPending}
                >
                  さらに読み込む（残り {remainingCount}件）
                </Button>
              ) : (
                displayedAlerts.length > 0 && (
                  <p className="text-sm text-gray-400">すべて表示しました</p>
                )
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-0">
          {/* ゾーン絞り込み */}
          {zones.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                variant={zoneId === undefined ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleZoneChange(undefined)}
                className="rounded-full"
              >
                すべて
              </Button>
              {zones.map((zone) => (
                <Button
                  key={zone.id}
                  variant={zoneId === zone.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleZoneChange(zone.id)}
                  className="rounded-full"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: getZoneColor(zone.id) }}
                  />
                  {zone.name}
                </Button>
              ))}
            </div>
          )}

          {/* アラート一覧 */}
          <div className={`space-y-3 ${isPending ? 'opacity-60' : ''}`}>
            {optimisticAlerts.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">
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

          {/* もっと見る */}
          {optimisticAlerts.length > 0 && (
            <div className="mt-4 text-center">
              {remainingCount > 0 ? (
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={isPending}
                >
                  さらに読み込む（残り {remainingCount}件）
                </Button>
              ) : (
                displayedAlerts.length > 0 && (
                  <p className="text-sm text-gray-400">すべて表示しました</p>
                )
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
