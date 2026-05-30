import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  threshold_breach: '#E24B4A',
  sensor_fault: '#EF9F27',
}

const BADGE_VARIANT: Record<string, 'red' | 'amber'> = {
  threshold_breach: 'red',
  sensor_fault: 'amber',
}

export function AlertCard({ alert, onResolve }: Props) {
  const isResolved = alert.resolved_at !== null
  const borderColor = BORDER_COLOR[alert.alert_type] ?? '#E24B4A'
  const badgeVariant = BADGE_VARIANT[alert.alert_type] ?? 'red'

  return (
    <div
      className="rounded-lg border border-gray-200 bg-white p-4"
      style={{ borderLeft: `4px solid ${borderColor}`, opacity: isResolved ? 0.7 : 1 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={badgeVariant}>{getBadgeLabel(alert)}</Badge>
          </div>

          <p className="text-sm font-medium text-gray-900">{getAlertTitle(alert)}</p>

          <p className="text-xs text-gray-500">
            {alert.zoneName}
            {alert.plantName && <> · {alert.plantName}</>}
          </p>

          <div className="flex flex-wrap gap-2">
            {alert.triggered_value !== null && (
              <Badge variant="secondary">
                発報値: {alert.triggered_value}
                {alert.unit ? ` ${alert.unit}` : ''}
              </Badge>
            )}
            {alert.alertThresholdValue !== null && (
              <Badge variant="secondary">
                {alert.breach_direction === 'high' ? '上限' : '下限'}: {alert.alertThresholdValue}
                {alert.unit ? ` ${alert.unit}` : ''}
              </Badge>
            )}
          </div>

          {isResolved && alert.resolved_at ? (
            <p className="text-xs font-medium text-green-600">
              解消済み · {formatDate(alert.resolved_at)} · 継続{' '}
              {formatDuration(alert.started_at, alert.resolved_at)}
            </p>
          ) : (
            <p className="text-xs text-gray-400">{formatElapsed(alert.started_at)}</p>
          )}
        </div>

        {!isResolved && onResolve && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onResolve(alert.id)}
          >
            解消
          </Button>
        )}
      </div>
    </div>
  )
}
