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

  if (sensorIds.length === 0) return null

  const filter = `sensor_id=in.(${sensorIds.join(',')})`
  const status = useRealtime({ channelName: `zone-readings-${channelKey}`, filter })

  useEffect(() => {
    setStatus(status)
  }, [status, setStatus])

  return null
}
