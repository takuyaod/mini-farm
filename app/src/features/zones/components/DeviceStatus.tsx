import { Cpu, MoreHorizontal, Wifi, WifiOff } from 'lucide-react'
import { OFFLINE_THRESHOLD_MIN } from '@/constants'
import type { Device, Sensor } from '../types'

type Props = {
  devices: Device[]
}

function formatLastSeen(lastSeenAt: string | null): string {
  if (!lastSeenAt) return '不明'
  const diffMs = Date.now() - new Date(lastSeenAt).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'たった今'
  if (minutes < 60) return `${minutes} 分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 時間前`
  return `${Math.floor(hours / 24)} 日前`
}

function RealtimeDot() {
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-default/40" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-default" />
    </span>
  )
}

function OfflineDot() {
  return <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-[#b9c1ba]" />
}

export function DeviceStatus({ devices }: Props) {
  if (devices.length === 0) return null

  const offlineThresholdMs = OFFLINE_THRESHOLD_MIN * 60 * 1000
  const now = Date.now()

  return (
    <section className="rounded-xl bg-white ring-1 ring-[#e6e9e5] shadow-sm">
      <div className="flex items-center justify-between px-6 pt-5">
        <h2 className="text-[15px] font-semibold tracking-tight text-content-primary">
          デバイス{' '}
          <span className="tabular-nums text-content-secondary">({devices.length})</span>
        </h2>
      </div>
      <ul className="divide-y divide-[#eef1ed]">
        {devices.map((device) => {
          const isOnline = device.last_seen_at
            ? now - new Date(device.last_seen_at).getTime() <= offlineThresholdMs
            : false
          const activeSensorTypes = device.sensors
            .filter((s: Sensor) => s.is_active)
            .map((s: Sensor) => s.sensor_type_masters.label)

          return (
            <li key={device.id} className="flex items-center gap-4 px-6 py-3.5">
              {/* Cpu icon */}
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f7f8f6] text-content-secondary ring-1 ring-[#eef1ed]">
                <Cpu className="h-[15px] w-[15px]" strokeWidth={2} />
              </span>

              {/* Device info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {isOnline ? <RealtimeDot /> : <OfflineDot />}
                  <span className="text-[13.5px] font-semibold text-content-primary">
                    {device.name ?? 'デバイス'}
                  </span>
                </div>
                {activeSensorTypes.length > 0 && (
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {activeSensorTypes.map((type) => (
                      <span
                        key={type}
                        className="inline-flex items-center rounded-full bg-[#f7f8f6] px-2 py-0.5 text-[10.5px] font-medium text-content-secondary ring-1 ring-inset ring-[#eef1ed]"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Connectivity + last seen */}
              <div className="flex items-center gap-4 text-[11.5px] tabular-nums text-content-secondary">
                {isOnline ? (
                  <span className="inline-flex items-center gap-1">
                    <Wifi className="h-3 w-3" strokeWidth={2} />
                    接続中
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-content-muted">
                    <WifiOff className="h-3 w-3" strokeWidth={2} />
                    切断
                  </span>
                )}
                <span className="text-content-muted">{formatLastSeen(device.last_seen_at)}</span>
              </div>

              {/* More menu */}
              <button className="grid h-8 w-8 place-items-center rounded-md text-content-muted hover:bg-[#f7f8f6] hover:text-content-primary">
                <MoreHorizontal className="h-[15px] w-[15px]" strokeWidth={2} />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
