'use client'

import { useEffect } from 'react'
import { useRealtimeContext } from '@/components/RealtimeContext'
import { useRealtime } from '@/lib/realtime/useRealtime'

type Props = {
  sensorIds: string[]
  channelKey: string
}

export function ZoneRealtimeProvider({ sensorIds, channelKey }: Props) {
  const { setStatus } = useRealtimeContext()
  const enabled = sensorIds.length > 0
  const filter = enabled ? `sensor_id=in.(${sensorIds.join(',')})` : undefined
  const status = useRealtime({ channelName: `zone-readings-${channelKey}`, filter, enabled })

  useEffect(() => {
    setStatus(status)
  }, [status, setStatus])

  return null
}
