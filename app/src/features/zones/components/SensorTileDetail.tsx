'use client'

import { LineChart } from 'lucide-react'
import type { SensorWithAlert } from '../types'

type Props = {
  sensor: SensorWithAlert
  isOffline: boolean
  isSelected: boolean
  onClick: () => void
}

function toPercent(value: number, min: number, max: number): number {
  if (max === min) return 50
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
}

export function SensorTileDetail({ sensor, isOffline, isSelected, onClick }: Props) {
  const { latestReading, threshold, sensor_type_masters } = sensor

  const label = sensor.label ?? sensor_type_masters.label
  const unit = sensor_type_masters.unit
  const value = latestReading?.value

  const isAlert = sensor.hasAlert
  const isHigh = sensor.alertBreachDirection === 'high'
  const isLow = sensor.alertBreachDirection === 'low'

  const barMin =
    threshold?.alert_min ?? threshold?.optimal_min ?? (value !== undefined ? value - 1 : 0)
  const barMax =
    threshold?.alert_max ?? threshold?.optimal_max ?? (value !== undefined ? value + 1 : 100)

  const showBar =
    threshold !== null &&
    (threshold.alert_min !== null ||
      threshold.optimal_min !== null ||
      threshold.optimal_max !== null ||
      threshold.alert_max !== null)

  const pct = (v: number) =>
    Math.max(0, Math.min(100, ((v - barMin) / (barMax - barMin)) * 100))

  const optimalLeft =
    threshold?.optimal_min != null ? pct(threshold.optimal_min) : null
  const optimalWidth =
    threshold?.optimal_min != null && threshold?.optimal_max != null
      ? pct(threshold.optimal_max) - pct(threshold.optimal_min)
      : null

  const valuePct = value !== undefined ? pct(value) : null

  return (
    <button
      onClick={onClick}
      className={`relative w-full rounded-xl p-4 text-left transition-all ${
        isAlert
          ? 'bg-[#fceeec] ring-1 ring-inset ring-[#f6d8d3] hover:ring-[#e9b5ad]'
          : isSelected
            ? 'bg-white shadow-sm ring-2 ring-[#1f6fd1]'
            : 'bg-white ring-1 ring-inset ring-[#e6e9e5] hover:ring-[#cdd3cb]'
      }`}
    >
      {/* Label row */}
      <div className="flex items-center justify-between gap-1">
        <span
          className={`text-[11px] font-medium uppercase tracking-wider ${
            isAlert ? 'text-[#b9351f]' : 'text-[#8a978f]'
          }`}
        >
          {label}
        </span>
        <div className="flex items-center gap-1">
          {isOffline && <span className="text-[10px] text-content-muted">最終値</span>}
          {isSelected && !isAlert && (
            <span className="inline-flex items-center gap-1 rounded bg-[#1f6fd1] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
              <LineChart className="h-2 w-2" strokeWidth={2.5} />
              表示中
            </span>
          )}
        </div>
      </div>

      {/* Alert badge */}
      {isHigh && (
        <span className="mt-1 inline-block rounded bg-[#d6452c] px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
          ▲ 上限超過
        </span>
      )}
      {isLow && (
        <span className="mt-1 inline-block rounded bg-[#d6452c] px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
          ▼ 下限割れ
        </span>
      )}

      {/* Value */}
      <div className="mt-1.5 flex items-baseline gap-1">
        {value !== undefined ? (
          <>
            <span
              className={`text-[28px] font-semibold tracking-tight tabular-nums ${
                isAlert ? 'text-[#b9351f]' : isOffline ? 'text-content-muted' : 'text-[#0f1a14]'
              }`}
            >
              {value.toLocaleString('ja-JP', { maximumFractionDigits: 1 })}
            </span>
            {unit && (
              <span
                className={`text-[12px] font-medium ${isAlert ? 'text-[#b9351f]/80' : 'text-[#8a978f]'}`}
              >
                {unit}
              </span>
            )}
          </>
        ) : (
          <span className="text-[28px] font-semibold text-content-muted">—</span>
        )}
      </div>

      {/* Range bar */}
      {showBar && valuePct !== null && (
        <>
          <div className="relative mt-2.5 h-[6px] rounded-full bg-[#f0d8d4]">
            {/* Green optimal band */}
            {optimalLeft !== null && optimalWidth !== null && (
              <div
                className="absolute top-0 h-full rounded-full bg-[#2f8a4a]"
                style={{ left: `${optimalLeft}%`, width: `${optimalWidth}%` }}
              />
            )}
            {/* Value marker (vertical bar) */}
            <div
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${valuePct}%` }}
            >
              <div
                className={`h-3 w-[3px] rounded-sm ${isAlert ? 'bg-[#b9351f]' : 'bg-[#0f1a14]'}`}
              />
            </div>
          </div>

          {/* Range hints */}
          <div className="mt-1.5 flex justify-between font-mono text-[10px] tabular-nums">
            <span className="text-[#b9351f]">
              {threshold?.alert_min ?? ''}
              <span className="ml-0.5 text-[#8a978f]">↓警</span>
            </span>
            <span className="text-[#246e3a]">
              {threshold?.optimal_min ?? ''}
              {threshold?.optimal_min != null && threshold?.optimal_max != null ? '–' : ''}
              {threshold?.optimal_max ?? ''}
              <span className="ml-0.5 text-[#8a978f]">適正</span>
            </span>
            <span className="text-[#b9351f]">
              <span className="mr-0.5 text-[#8a978f]">警↑</span>
              {threshold?.alert_max ?? ''}
            </span>
          </div>
        </>
      )}

      {/* Blue bottom bar when selected */}
      {isSelected && (
        <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-b-xl bg-[#1f6fd1]" />
      )}
    </button>
  )
}
