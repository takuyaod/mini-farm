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
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-400">センサーなし</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">センサー現況</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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

      {selectedSensor && (
        <SensorChart
          sensorId={selectedSensor.id}
          sensorLabel={selectedSensor.label ?? selectedSensor.sensor_type_masters.label}
          sensorUnit={selectedSensor.sensor_type_masters.unit ?? undefined}
          threshold={selectedSensor.threshold}
        />
      )}
    </div>
  )
}
