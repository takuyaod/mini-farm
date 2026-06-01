'use client'

import { Button } from '@/components/ui/button'
import type { AlertWithContext } from '../types'

type Props = {
  alert: AlertWithContext
  onResolve?: (alertId: string) => void
}

function getBadgeLabel(alert: AlertWithContext): string {
  if (alert.alert_type === 'sensor_fault') return 'センサー異常'
  if (alert.breach_direction === 'high') return '上限超過'
  if (alert.breach_direction === 'low') return '下限割れ'
  return '逸脱'
}

function getAlertTitle(alert: AlertWithContext): string {
  if (alert.alert_type === 'sensor_fault') return `${alert.sensorLabel} でセンサー異常が発生しています`
  if (alert.breach_direction === 'high') return `${alert.sensorLabel} が上限を超過しています`
  if (alert.breach_direction === 'low') return `${alert.sensorLabel} が下限を下回っています`
  return `${alert.sensorLabel} で異常が発生しています`
}

function formatElapsed(startedAt: string): string {
  const diffMs = Date.now() - new Date(startedAt).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `${Math.max(minutes, 1)}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前`
  return `${Math.floor(hours / 24)}日前`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(startedAt: string, resolvedAt: string): string {
  const diffMs = new Date(resolvedAt).getTime() - new Date(startedAt).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `${minutes}分`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間`
  return `${Math.floor(hours / 24)}日`
}

const BORDER_COLOR: Record<string, string> = {
  threshold_breach: '#d6452c',
  sensor_fault: '#b1740a',
}

export function AlertCard({ alert, onResolve }: Props) {
  const isResolved = alert.resolved_at !== null
  const borderColor = BORDER_COLOR[alert.alert_type] ?? '#d6452c'
  const isSensorFault = alert.alert_type === 'sensor_fault'

  return (
    <div
      className="rounded-xl bg-white px-5 py-4"
      style={{
        border: '1px solid #e6e9e5',
        borderLeftColor: borderColor,
        borderLeftWidth: '4px',
        opacity: isResolved ? 0.75 : 1,
        boxShadow: '0 1px 0 rgba(15,26,20,.02), 0 1px 2px rgba(15,26,20,.04)',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* バッジ行 */}
          <div className="flex flex-wrap items-center gap-1.5">
            {isSensorFault ? (
              <span className="inline-flex items-center rounded bg-[#b1740a] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                {getBadgeLabel(alert)}
              </span>
            ) : (
              <span className="inline-flex items-center rounded bg-[#d6452c] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                {getBadgeLabel(alert)}
              </span>
            )}
          </div>

          {/* タイトル */}
          <p className="text-[14px] font-medium leading-snug text-[#0f1a14]">
            {getAlertTitle(alert)}
          </p>

          {/* ゾーン名・植物名 */}
          <p className="text-[12.5px] text-[#4b5a52]">
            {alert.zoneName}
            {alert.plantName && <> · {alert.plantName}</>}
          </p>

          {/* 発報値・閾値バッジ */}
          <div className="flex flex-wrap gap-2">
            {alert.triggered_value !== null && (
              <span className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-[#4b5a52]">
                発報値:{' '}
                <span className="ml-0.5 font-mono tabular-nums">
                  {alert.triggered_value}
                  {alert.unit ? ` ${alert.unit}` : ''}
                </span>
              </span>
            )}
            {alert.alertThresholdValue !== null && (
              <span className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-[#4b5a52]">
                {alert.breach_direction === 'high' ? '上限' : '下限'}:{' '}
                <span className="ml-0.5 font-mono tabular-nums">
                  {alert.alertThresholdValue}
                  {alert.unit ? ` ${alert.unit}` : ''}
                </span>
              </span>
            )}
          </div>

          {/* 解消済み / 経過時間 */}
          {isResolved && alert.resolved_at ? (
            <p className="font-mono text-[11.5px] font-medium tabular-nums text-[#246e3a]">
              解消済み · {formatDate(alert.resolved_at)} · 継続{' '}
              {formatDuration(alert.started_at, alert.resolved_at)}
            </p>
          ) : (
            <p className="font-mono text-[11.5px] tabular-nums text-[#8a978f]">
              {formatElapsed(alert.started_at)}
            </p>
          )}
        </div>

        {!isResolved && onResolve && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResolve(alert.id)}
            className="shrink-0 border-surface-border text-[#4b5a52] hover:border-[#cdd3cb] hover:bg-surface-muted hover:text-[#0f1a14]"
          >
            解消
          </Button>
        )}
      </div>
    </div>
  )
}
