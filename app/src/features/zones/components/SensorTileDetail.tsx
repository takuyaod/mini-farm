'use client'

import type { SensorWithReadingDetail } from '../types'

type Props = {
  sensors: SensorWithReadingDetail[]
  selectedSensorId: string | null
  onSelect: (sensorId: string) => void
  isOffline: boolean
}

function toPercent(value: number, min: number, max: number): number {
  if (max === min) return 50
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
}

type TileProps = {
  sensor: SensorWithReadingDetail
  isSelected: boolean
  isOffline: boolean
  onSelect: () => void
}

function SensorTile({ sensor, isSelected, isOffline, onSelect }: TileProps) {
  const { latestReading, threshold, sensor_type_masters, hasAlert, alert } = sensor
  const label = sensor.label ?? sensor_type_masters.label
  const unit = sensor_type_masters.unit
  const value = latestReading?.value

  const alertLabel =
    alert?.breach_direction === 'high'
      ? '上限超過'
      : alert?.breach_direction === 'low'
        ? '下限割れ'
        : null

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
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border p-3 text-left transition-all ${
        hasAlert
          ? 'border-red-300 bg-red-50'
          : isSelected
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
      }`}
      style={
        isSelected && !hasAlert
          ? { borderWidth: '1.5px', borderColor: 'var(--color-border-info, #60a5fa)' }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={`text-xs font-medium ${
            hasAlert ? 'text-red-700' : isSelected ? 'text-blue-700' : 'text-gray-600'
          }`}
        >
          {label}
        </span>
        <div className="flex items-center gap-1">
          {isOffline && !hasAlert && (
            <span className="text-xs text-gray-400">最終値</span>
          )}
          {hasAlert && alertLabel && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {alertLabel}
            </span>
          )}
          {isSelected && (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
              グラフ表示中
            </span>
          )}
        </div>
      </div>

      <div
        className={`mt-0.5 text-lg font-semibold tabular-nums ${
          isOffline ? 'text-gray-400' : hasAlert ? 'text-red-700' : 'text-gray-900'
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
        <>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full w-1 rounded-full transition-all ${
                inOptimalRange === false ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ marginLeft: `calc(${valuePercent}% - 2px)` }}
            />
          </div>
          {threshold && (
            <div className="mt-1 flex justify-between text-[10px] text-gray-400">
              <span>{threshold.alert_min ?? '—'}</span>
              <span>
                {threshold.optimal_min ?? '—'} – {threshold.optimal_max ?? '—'}
              </span>
              <span>{threshold.alert_max ?? '—'}</span>
            </div>
          )}
        </>
      )}
    </button>
  )
}

export function SensorTileDetail({ sensors, selectedSensorId, onSelect, isOffline }: Props) {
  if (sensors.length === 0) {
    return <p className="text-sm text-gray-400">センサーなし</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {sensors.map((sensor) => (
        <SensorTile
          key={sensor.id}
          sensor={sensor}
          isSelected={sensor.id === selectedSensorId}
          isOffline={isOffline}
          onSelect={() => onSelect(sensor.id)}
        />
      ))}
    </div>
  )
}
