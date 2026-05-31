import type { SensorWithReading } from '../types'

type Props = {
  sensor: SensorWithReading
  isOffline: boolean
  breachDirection?: 'high' | 'low' | null
}

function toPercent(value: number, min: number, max: number): number {
  if (max === min) return 50
  return ((value - min) / (max - min)) * 100
}

function formatValue(value: number): string {
  if (value >= 1000) return value.toLocaleString('ja-JP', { maximumFractionDigits: 0 })
  const fixed = value.toFixed(1)
  return fixed.endsWith('.0') ? String(Math.round(value)) : fixed
}

export function SensorTile({ sensor, isOffline, breachDirection }: Props) {
  const { latestReading, threshold, sensor_type_masters } = sensor
  const label = sensor.label ?? sensor_type_masters.label
  const unit = sensor_type_masters.unit
  const value = latestReading?.value

  const showBar =
    threshold !== null &&
    (threshold.alert_min !== null ||
      threshold.optimal_min !== null ||
      threshold.alert_max !== null ||
      threshold.optimal_max !== null)

  const barMin =
    threshold?.alert_min ?? threshold?.optimal_min ?? (value !== undefined ? value - 1 : 0)
  const barMax =
    threshold?.alert_max ?? threshold?.optimal_max ?? (value !== undefined ? value + 1 : 100)

  const optimalStartPct =
    threshold?.optimal_min !== null && threshold?.optimal_min !== undefined
      ? Math.max(0, Math.min(100, toPercent(threshold.optimal_min, barMin, barMax)))
      : null
  const optimalEndPct =
    threshold?.optimal_max !== null && threshold?.optimal_max !== undefined
      ? Math.max(0, Math.min(100, toPercent(threshold.optimal_max, barMin, barMax)))
      : null
  const markerPct =
    value !== undefined
      ? Math.max(0, Math.min(100, toPercent(value, barMin, barMax)))
      : null

  const isAlert = sensor.hasAlert && !isOffline
  const alertBadgeText =
    isAlert && breachDirection
      ? breachDirection === 'high'
        ? '▲上限'
        : '▼下限'
      : null

  return (
    <div
      className={`rounded-md border p-2.5 ${
        isAlert ? 'border-alert-border bg-alert-bg' : 'border-surface-border bg-surface-bg'
      }`}
    >
      {/* ラベル行 */}
      <div className="flex items-start justify-between gap-1">
        <span
          className={`text-xs font-medium ${
            isAlert ? 'text-alert-text' : 'text-content-secondary'
          }`}
        >
          {label}
        </span>
        {alertBadgeText ? (
          <span className="shrink-0 rounded bg-alert-text px-1 py-0.5 text-[10px] font-bold leading-none text-white">
            {alertBadgeText}
          </span>
        ) : isOffline ? (
          <span className="text-[10px] text-content-muted">最終値</span>
        ) : null}
      </div>

      {/* 値 */}
      <div
        className={`mt-0.5 text-xl font-semibold tabular-nums leading-tight ${
          isOffline
            ? 'text-content-muted'
            : isAlert
              ? 'text-alert-text'
              : 'text-content-primary'
        }`}
      >
        {value !== undefined ? (
          <>
            {formatValue(value)}
            {unit && (
              <span className="ml-0.5 text-xs font-normal text-content-secondary">{unit}</span>
            )}
          </>
        ) : (
          <span className="text-sm text-content-muted">—</span>
        )}
      </div>

      {/* プログレスバー */}
      {showBar && markerPct !== null && (
        <div className="mt-2">
          <div className="relative h-1.5">
            {/* トラック（最適範囲外はピンク） */}
            <div className="absolute inset-0 overflow-hidden rounded-full bg-alert-hover">
              {optimalStartPct !== null && optimalEndPct !== null && (
                <div
                  className="absolute inset-y-0 bg-brand-default"
                  style={{ left: `${optimalStartPct}%`, right: `${100 - optimalEndPct}%` }}
                />
              )}
            </div>
            {/* 値マーカー */}
            <div
              className="absolute w-0.5 rounded-full bg-content-primary"
              style={{
                left: `${markerPct}%`,
                top: '50%',
                height: '10px',
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>
          <div className="mt-0.5 flex justify-between text-[10px] text-content-muted">
            <span>{formatValue(barMin)}</span>
            <span>{formatValue(barMax)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
