'use client'

import { useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import { resolveAlert } from '../api/resolveAlert'
import type { Alert, SensorWithReading } from '../types'

type Props = {
  alerts: Alert[]
  sensors: SensorWithReading[]
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

  function getSensorLabel(sensorId: string) {
    const sensor = sensors.find((s) => s.id === sensorId)
    return sensor?.label ?? sensor?.sensor_type_masters.label ?? sensorId
  }

  function getAlertLabel(alert: Alert) {
    const type = alert.alert_type
    const dir = alert.breach_direction
    if (type === 'sensor_fault') return 'センサー異常'
    if (dir === 'high') return '上限超過'
    if (dir === 'low') return '下限割れ'
    return '逸脱'
  }

  return (
    <div className="mt-3 space-y-1.5">
      {displayed.map((alert) => (
        <div
          key={alert.id}
          className="flex items-center justify-between gap-2 rounded-md border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs"
        >
          <span className="text-red-800">
            {getSensorLabel(alert.sensor_id)} — {getAlertLabel(alert)}
          </span>
          <button
            onClick={() => {
              startTransition(async () => {
                removeAlert(alert.id)
                await resolveAlert(alert.id)
              })
            }}
            className="shrink-0 rounded px-1.5 py-0.5 text-xs text-red-700 hover:bg-red-100"
          >
            解消
          </button>
        </div>
      ))}
      {hasMore && (
        <Link href="/alerts" className="block text-xs text-gray-500 hover:underline">
          すべて見る →
        </Link>
      )}
    </div>
  )
}
