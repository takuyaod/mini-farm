import { Wifi, WifiOff } from 'lucide-react'
import { OFFLINE_THRESHOLD_MIN } from '@/constants'
import type { Device } from '../types'

type Props = {
  devices: Device[]
}

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false
  return Date.now() - new Date(lastSeenAt).getTime() < OFFLINE_THRESHOLD_MIN * 60 * 1000
}

function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) return '受信なし'
  const diff = Date.now() - new Date(lastSeenAt).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'たった今'
  if (mins < 60) return `${mins}分前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}時間前`
  return `${Math.floor(hours / 24)}日前`
}

export function DeviceStatus({ devices }: Props) {
  if (devices.length === 0) {
    return <p className="text-sm text-gray-400">デバイスなし</p>
  }

  return (
    <div className="space-y-2">
      {devices.map((device) => {
        const online = isOnline(device.last_seen_at)
        const sensorTypes = [
          ...new Set(
            device.sensors
              .filter((s) => s.is_active)
              .map((s) => s.label ?? s.sensor_type_masters.label)
          ),
        ]

        return (
          <div
            key={device.id}
            className="flex items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3"
          >
            <div className="flex items-center gap-3">
              {online ? (
                <Wifi className="h-4 w-4 animate-pulse text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-gray-400" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {device.name ?? 'デバイス'}
                </p>
                <p className="text-xs text-gray-500">最終受信: {formatLastSeen(device.last_seen_at)}</p>
              </div>
            </div>
            {sensorTypes.length > 0 && (
              <div className="flex flex-wrap justify-end gap-1">
                {sensorTypes.map((type) => (
                  <span
                    key={type}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                  >
                    {type}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
