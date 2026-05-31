'use client'

import { useState } from 'react'
import { SensorTileDetail } from './SensorTileDetail'
import { SensorChart } from './SensorChart'
import type { SensorWithAlert } from '../types'

type Props = {
  sensors: SensorWithAlert[]
  isOffline: boolean
}

export function SensorSection({ sensors, isOffline }: Props) {
  const initialSensor = sensors.find((s) => s.hasAlert) ?? sensors[0] ?? null
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(
    initialSensor?.id ?? null
  )

  const selectedSensor = sensors.find((s) => s.id === selectedSensorId) ?? null

  if (sensors.length === 0) {
    return (
      <div className="rounded-xl bg-white p-4 ring-1 ring-[#e6e9e5] shadow-sm">
        <p className="text-sm text-content-muted">センサーなし</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Sensor tiles */}
      <div>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-[14px] font-semibold tracking-tight text-content-primary">
            センサー現況{' '}
            <span className="tabular-nums text-content-secondary">({sensors.length})</span>
          </h2>
          <span className="text-[11px] text-content-muted">タイルをクリックでグラフを切替</span>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {sensors.map((sensor) => (
            <SensorTileDetail
              key={sensor.id}
              sensor={sensor}
              isOffline={isOffline}
              isSelected={sensor.id === selectedSensorId}
              onClick={() => setSelectedSensorId(sensor.id)}
            />
          ))}
        </div>
      </div>

      {/* Chart */}
      {selectedSensor && (
        <SensorChart
          sensorId={selectedSensor.id}
          sensorLabel={selectedSensor.label ?? selectedSensor.sensor_type_masters.label}
          sensorUnit={selectedSensor.sensor_type_masters.unit ?? undefined}
          threshold={selectedSensor.threshold}
          hasAlert={selectedSensor.hasAlert}
        />
      )}
    </div>
  )
}
