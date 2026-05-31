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

  const inOptimalRange =
    threshold && value !== undefined
      ? (threshold.optimal_min === null || value >= threshold.optimal_min) &&
        (threshold.optimal_max === null || value <= threshold.optimal_max)
      : null

  const showBar =
    threshold !== null &&
    (threshold.alert_min !== null ||
      threshold.optimal_min !== null ||
      threshold.optimal_max !== null ||
      threshold.alert_max !== null)

  const barMin =
    threshold?.alert_min ?? threshold?.optimal_min ?? (value !== undefined ? value - 1 : 0)
  const barMax =
    threshold?.alert_max ?? threshold?.optimal_max ?? (value !== undefined ? value + 1 : 100)

  const valuePercent =
    value !== undefined && barMin !== undefined && barMax !== undefined
      ? toPercent(value, barMin, barMax)
      : null

  const alertLabel =
    sensor.hasAlert
      ? sensor.alertBreachDirection === 'high'
        ? '上限超過'
        : sensor.alertBreachDirection === 'low'
          ? '下限割れ'
          : 'アラート中'
      : null

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-md p-2 text-left transition-colors ${
        sensor.hasAlert
          ? 'border border-alert-border bg-alert-bg'
          : isSelected
            ? 'border-[1.5px] border-brand-default bg-surface-muted'
            : 'border border-surface-border bg-surface-bg hover:bg-surface-muted'
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={`text-xs font-medium ${
            sensor.hasAlert ? 'text-alert-text' : 'text-content-secondary'
          }`}
        >
          {label}
        </span>
        <div className="flex items-center gap-1">
          {isOffline && <span className="text-[10px] text-content-muted">最終値</span>}
          {isSelected && !sensor.hasAlert && (
            <span className="text-[10px] font-medium text-brand-default">グラフ表示中</span>
          )}
        </div>
      </div>

      {alertLabel && (
        <div className="text-xs font-medium text-alert-text">{alertLabel}</div>
      )}

      <div
        className={`mt-0.5 text-base font-semibold tabular-nums ${
          isOffline ? 'text-content-muted' : sensor.hasAlert ? 'text-alert-text' : 'text-content-primary'
        }`}
      >
        {value !== undefined ? (
          <>
            {value.toFixed(1)}
            {unit && <span className="ml-0.5 text-xs font-normal text-content-secondary">{unit}</span>}
          </>
        ) : (
          <span className="text-sm text-content-muted">—</span>
        )}
      </div>

      {showBar && valuePercent !== null && (
        <>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className={`h-full w-1 rounded-full transition-all ${
                inOptimalRange === false ? 'bg-alert-text' : 'bg-brand-default'
              }`}
              style={{ marginLeft: `calc(${valuePercent}% - 2px)` }}
            />
          </div>
          <div className="mt-0.5 flex justify-between text-[10px] text-content-muted">
            <span>{threshold?.alert_min ?? ''}</span>
            <span>
              {threshold?.optimal_min ?? ''}
              {threshold?.optimal_min !== null && threshold?.optimal_max !== null ? '–' : ''}
              {threshold?.optimal_max ?? ''}
            </span>
            <span>{threshold?.alert_max ?? ''}</span>
          </div>
        </>
      )}
    </button>
  )
}
