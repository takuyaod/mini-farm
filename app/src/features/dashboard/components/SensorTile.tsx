import type { SensorWithReading } from '../types'

type Props = {
  sensor: SensorWithReading
  isOffline: boolean
}

function toPercent(value: number, min: number, max: number): number {
  if (max === min) return 50
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
}

export function SensorTile({ sensor, isOffline }: Props) {
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

  return (
    <div
      className={`rounded-md border p-2 ${
        sensor.hasAlert ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={`text-xs font-medium ${
            sensor.hasAlert ? 'text-red-700' : 'text-gray-600'
          }`}
        >
          {label}
        </span>
        {isOffline && (
          <span className="text-xs text-gray-400">最終値</span>
        )}
      </div>
      <div
        className={`mt-0.5 text-base font-semibold tabular-nums ${
          isOffline ? 'text-gray-400' : sensor.hasAlert ? 'text-red-700' : 'text-gray-900'
        }`}
      >
        {value !== undefined ? (
          <>
            {value.toFixed(1)}
            {unit && <span className="ml-0.5 text-xs font-normal text-gray-500">{unit}</span>}
          </>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        )}
      </div>
      {showBar && valuePercent !== null && (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full w-1 rounded-full transition-all ${
              inOptimalRange === false ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ marginLeft: `calc(${valuePercent}% - 2px)` }}
          />
        </div>
      )}
    </div>
  )
}
