'use client'

import { useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resolveAlert } from '../api/resolveAlert'
import type { Alert, SensorWithReading } from '../types'

type Props = {
  alerts: Alert[]
  sensors: SensorWithReading[]
}

function formatValue(value: number): string {
  if (value >= 1000) return value.toLocaleString('ja-JP', { maximumFractionDigits: 0 })
  const fixed = value.toFixed(1)
  return fixed.endsWith('.0') ? String(Math.round(value)) : fixed
}

function formatElapsed(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'たった今'
  if (mins < 60) return `${mins}分前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}時間前`
  return `${Math.floor(hours / 24)}日前`
}

function getAlertText(alert: Alert, sensors: SensorWithReading[]): string {
  const sensor = sensors.find((s) => s.id === alert.sensor_id)
  const label = sensor?.label ?? sensor?.sensor_type_masters.label ?? '不明'
  const unit = sensor?.sensor_type_masters.unit ?? ''

  const valuePart =
    alert.triggered_value !== null
      ? `${formatValue(alert.triggered_value)}${unit ? ' ' + unit : ''}`
      : ''

  let thresholdPart = ''
  if (sensor?.threshold) {
    if (alert.breach_direction === 'high' && sensor.threshold.alert_max !== null) {
      thresholdPart = `上限 ${formatValue(sensor.threshold.alert_max)}`
    } else if (alert.breach_direction === 'low' && sensor.threshold.alert_min !== null) {
      thresholdPart = `下限 ${formatValue(sensor.threshold.alert_min)}`
    }
  }

  const detail = [valuePart, thresholdPart ? `（${thresholdPart}）` : ''].filter(Boolean).join('')
  return detail ? `${label}・${detail}` : label
}

export function AlertList({ alerts, sensors }: Props) {
  const [optimisticAlerts, removeAlert] = useOptimistic(
    alerts,
    (current, alertId: string) => current.filter((a) => a.id !== alertId)
  )
  const [, startTransition] = useTransition()

  const MAX_DISPLAY = 5
  const displayed = optimisticAlerts.slice(0, MAX_DISPLAY)
  const hasMore = optimisticAlerts.length > MAX_DISPLAY

  if (optimisticAlerts.length === 0) return null

  return (
    <div className="space-y-1.5">
      {displayed.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center justify-between gap-2 rounded-md border border-alert-border bg-alert-bg px-2.5 py-1.5 text-xs"
        >
          <span className="flex min-w-0 items-center gap-1.5 text-alert-text-strong">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-alert-text" />
            <span className="truncate">{getAlertText(alert, sensors)}</span>
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <span className="whitespace-nowrap text-content-muted">
              {formatElapsed(alert.started_at)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                startTransition(async () => {
                  removeAlert(alert.id)
                  await resolveAlert(alert.id)
                })
              }}
              className="h-auto gap-0.5 px-1.5 py-0.5 text-xs text-alert-text hover:bg-alert-hover"
            >
              <Check className="h-3 w-3" />
              解消
            </Button>
          </div>
        </div>
      ))}
      {hasMore && (
        <Link href="/alerts" className="block text-xs text-content-secondary hover:underline">
          すべて見る →
        </Link>
      )}
    </div>
  )
}
