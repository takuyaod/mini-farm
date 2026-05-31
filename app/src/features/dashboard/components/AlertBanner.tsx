import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import type { Alert, ZoneCardData } from '../types'

type AlertWithZone = Alert & { zoneName: string; sensorLabel: string }

type Props = {
  zones: ZoneCardData[]
}

export function AlertBanner({ zones }: Props) {
  const alertsWithZone: AlertWithZone[] = zones.flatMap((zc) =>
    zc.unresolvedAlerts.map((alert) => {
      const sensor = zc.sensorsWithReadings.find((s) => s.id === alert.sensor_id)
      return {
        ...alert,
        zoneName: zc.zone.name,
        sensorLabel: sensor?.label ?? sensor?.sensor_type_masters.label ?? alert.sensor_id,
      }
    })
  )

  if (alertsWithZone.length === 0) return null

  const MAX_DISPLAY = 3
  const displayed = alertsWithZone.slice(0, MAX_DISPLAY)
  const remaining = alertsWithZone.length - MAX_DISPLAY

  return (
    <div className="flex items-center gap-3 rounded-lg border border-alert-border bg-alert-bg px-4 py-3 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0 text-alert-text" />
      {/* 本文は alert-text-strong（より暗いトーン）でアイコン・リンクより可読性を高める */}
      <span className="flex-1 text-alert-text-strong">
        {displayed.map((a, i) => (
          <span key={a.id}>
            {i > 0 && '、'}
            {a.zoneName}（{a.sensorLabel}）
          </span>
        ))}
        {remaining > 0 && <span>、他 {remaining}件</span>}
      </span>
      <Link href="/alerts" className="shrink-0 font-medium text-alert-text hover:underline">
        確認する →
      </Link>
    </div>
  )
}
