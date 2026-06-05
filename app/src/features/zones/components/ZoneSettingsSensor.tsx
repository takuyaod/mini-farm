'use client'

import { useActionState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { decommissionSensor, type DecommissionSensorState } from '../api/decommissionSensor'
import type { Sensor } from '@/types'

type SensorRowProps = {
  sensor: Sensor
  zoneId: string
}

const initialState: DecommissionSensorState = { success: false }

function SensorRow({ sensor, zoneId }: SensorRowProps) {
  const [state, formAction, isPending] = useActionState(decommissionSensor, initialState)

  if (state.success) return null

  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-sm text-gray-800">
          {sensor.label ?? sensor.sensor_type_masters.label}
        </p>
        <p className="text-xs text-gray-500">{sensor.sensor_type_masters.label}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <form action={formAction}>
          <input type="hidden" name="sensor_id" value={sensor.id} />
          <input type="hidden" name="zone_id" value={zoneId} />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={isPending}
            className="border-red-200 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isPending ? '削除中...' : '削除'}
          </Button>
        </form>
        {state.error && <p className="text-xs text-red-500">{state.error}</p>}
      </div>
    </div>
  )
}

type Props = {
  sensors: Sensor[]
  zoneId: string
}

export function ZoneSettingsSensor({ sensors, zoneId }: Props) {
  if (sensors.length === 0) {
    return <p className="text-sm text-gray-500">アクティブなセンサーがありません</p>
  }

  return (
    <div className="divide-y divide-gray-100">
      {sensors.map((sensor) => (
        <SensorRow key={sensor.id} sensor={sensor} zoneId={zoneId} />
      ))}
    </div>
  )
}
