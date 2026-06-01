'use client'

import Link from 'next/link'
import { ArrowUp, ArrowDown, Wifi, MapPin, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
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
  if (alert.alert_type === 'sensor_fault') return `でセンサー異常が発生しています`
  if (alert.breach_direction === 'high') return `が上限を超過しています`
  if (alert.breach_direction === 'low') return `が下限を下回っています`
  return `で異常が発生しています`
}

function formatElapsed(startedAt: string): string {
  const diffMs = Date.now() - new Date(startedAt).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `${Math.max(minutes, 1)}分`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間`
  return `${Math.floor(hours / 24)}日`
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  return `${year}/${month}/${day} ${hour}:${minute}`
}

function formatDuration(startedAt: string, resolvedAt: string): string {
  const diffMs = new Date(resolvedAt).getTime() - new Date(startedAt).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return `${minutes}分`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間`
  return `${Math.floor(hours / 24)}日`
}

function AlertTypeIcon({ alert }: { alert: AlertWithContext }) {
  const isSensorFault = alert.alert_type === 'sensor_fault'
  const isHigh = alert.breach_direction === 'high'

  if (isSensorFault) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fdf3e2]">
        <Wifi className="h-5 w-5 text-[#b1740a]" />
      </div>
    )
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-alert-bg">
      {isHigh ? (
        <ArrowUp className="h-5 w-5 text-[#d6452c]" />
      ) : (
        <ArrowDown className="h-5 w-5 text-[#d6452c]" />
      )}
    </div>
  )
}

export function AlertCard({ alert, onResolve }: Props) {
  const isResolved = alert.resolved_at !== null
  const isSensorFault = alert.alert_type === 'sensor_fault'
  const borderColor = isSensorFault ? '#b1740a' : '#d6452c'
  const elapsed = formatElapsed(alert.started_at)

  return (
    <div
      className="rounded-xl bg-white shadow-[0_1px_0_rgba(15,26,20,.02),0_1px_2px_rgba(15,26,20,.04)]"
      style={{
        border: '1px solid #e6e9e5',
        borderLeftColor: borderColor,
        borderLeftWidth: '4px',
        opacity: isResolved ? 0.78 : 1,
      }}
    >
      <div className="flex items-start gap-3 px-4 py-4">
        {/* アイコンカラム */}
        <AlertTypeIcon alert={alert} />

        {/* メインコンテンツ */}
        <div className="min-w-0 flex-1 space-y-2">
          {/* バッジ行：種別・センサーラベル・デバイスID */}
          <div className="flex flex-wrap items-center gap-1.5">
            {isSensorFault ? (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white bg-[#b1740a]">
                {getBadgeLabel(alert)}
              </span>
            ) : (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white bg-[#d6452c]">
                {getBadgeLabel(alert)}
              </span>
            )}
            <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-surface-muted text-[#4b5a52]">
              {alert.sensorLabel}
            </span>
            {alert.deviceId && (
              <span className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-medium bg-surface-muted text-content-muted">
                {alert.deviceId.slice(0, 8)}
              </span>
            )}
          </div>

          {/* タイトル行：センサー名を赤テキストで強調 */}
          <p className="text-[13.5px] font-medium leading-snug text-[#0f1a14]">
            <span className={isSensorFault ? 'text-[#b1740a]' : 'text-alert-text'}>
              {alert.sensorLabel}
            </span>
            {getAlertTitle(alert)}
          </p>

          {/* ゾーン名・植物名 */}
          <p className="flex items-center gap-1 text-[12px] text-[#4b5a52]">
            <MapPin className="h-3 w-3 shrink-0 text-[#8a978f]" />
            {alert.zoneName}
            {alert.plantName && <> · {alert.plantName}</>}
          </p>

          {/* 発報値・閾値バッジ */}
          {(alert.triggered_value !== null || alert.alertThresholdValue !== null) && (
            <div className="flex flex-wrap gap-2">
              {alert.triggered_value !== null && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums bg-surface-muted text-[#4b5a52]">
                  発報値:{' '}
                  <span className="ml-0.5 font-mono tabular-nums">
                    {alert.triggered_value}
                    {alert.unit ? ` ${alert.unit}` : ''}
                  </span>
                </span>
              )}
              {alert.alertThresholdValue !== null && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums bg-surface-muted text-[#4b5a52]">
                  {alert.breach_direction === 'high' ? '上限' : '下限'}:{' '}
                  <span className="ml-0.5 font-mono tabular-nums">
                    {alert.alertThresholdValue}
                    {alert.unit ? ` ${alert.unit}` : ''}
                  </span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* 右カラム：日時・経過時間・アクション */}
        <div className="flex shrink-0 flex-col items-end gap-2.5">
          {/* 発報日時 */}
          <div className="text-right">
            <p className="text-[11px] font-medium tabular-nums text-[#4b5a52]">
              {formatDateTime(alert.started_at)}
            </p>
            {isResolved && alert.resolved_at ? (
              <div className="mt-0.5 flex items-center justify-end gap-1">
                <CheckCircle2 className="h-3 w-3 text-brand-default" />
                <p className="font-mono text-[11px] font-medium tabular-nums text-brand-default">
                  解消 · 継続 {formatDuration(alert.started_at, alert.resolved_at)}
                </p>
              </div>
            ) : (
              <div className="mt-0.5 flex items-center justify-end gap-1">
                <AlertCircle className="h-3 w-3 shrink-0 text-[#d6452c]" />
                <p className="font-mono text-[11px] tabular-nums text-[#d6452c]">
                  {elapsed}経過
                </p>
              </div>
            )}
          </div>

          {/* アクションボタン群 */}
          <div className="flex items-center gap-1.5">
            <Link
              href={`/zones/${alert.zoneId}`}
              className="inline-flex h-7 items-center rounded-md border border-surface-border px-2.5 text-[12px] font-medium text-[#4b5a52] transition-colors hover:bg-surface-bg hover:text-[#0f1a14]"
            >
              詳細
            </Link>
            {!isResolved && onResolve && (
              <Button
                size="sm"
                onClick={() => onResolve(alert.id)}
                className="h-7 border-0 bg-brand-default px-2.5 text-[12px] font-medium text-white hover:bg-[#2f8a4a]"
              >
                解消
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
