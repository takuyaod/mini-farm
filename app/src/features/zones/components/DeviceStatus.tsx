import { Wifi, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { OFFLINE_THRESHOLD_MIN } from '@/constants'
import type { Device, Sensor } from '../types'

type Props = {
  devices: Device[]
}

export function DeviceStatus({ devices }: Props) {
  if (devices.length === 0) return null

  const offlineThresholdMs = OFFLINE_THRESHOLD_MIN * 60 * 1000
  const now = Date.now()

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">デバイス</h3>
      <div className="flex flex-col gap-3">
        {devices.map((device) => {
          const isOnline = device.last_seen_at
            ? now - new Date(device.last_seen_at).getTime() <= offlineThresholdMs
            : false
          const activeSensorTypes = device.sensors
            .filter((s: Sensor) => s.is_active)
            .map((s: Sensor) => s.sensor_type_masters.label)

          return (
            <div key={device.id} className="flex items-center gap-3">
              {isOnline ? (
                <Wifi className="h-4 w-4 shrink-0 animate-pulse text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 shrink-0 text-gray-400" />
              )}
              <span className="text-sm text-gray-700">{device.name ?? 'デバイス'}</span>
              <div className="flex flex-wrap gap-1">
                {activeSensorTypes.map((type) => (
                  <Badge key={type} variant="secondary">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
