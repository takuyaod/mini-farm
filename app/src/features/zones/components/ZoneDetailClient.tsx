'use client'

import { useState } from 'react'
import { SensorTileDetail } from './SensorTileDetail'
import { SensorChart } from './SensorChart'
import type { SensorWithReadingDetail } from '../types'

type Props = {
  sensors: SensorWithReadingDetail[]
  isOffline: boolean
}

export function ZoneDetailClient({ sensors, isOffline }: Props) {
  const initialSensor = sensors.find((s) => s.hasAlert) ?? sensors[0] ?? null
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(
    initialSensor?.id ?? null
  )

  const selectedSensor = sensors.find((s) => s.id === selectedSensorId) ?? null

  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-3 text-sm font-medium text-gray-500">センサー現況</h2>
        <SensorTileDetail
          sensors={sensors}
          selectedSensorId={selectedSensorId}
          onSelect={setSelectedSensorId}
          isOffline={isOffline}
        />
      </section>
      {selectedSensor && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-gray-500">グラフ</h2>
          <SensorChart sensor={selectedSensor} />
        </section>
      )}
    </div>
  )
}
