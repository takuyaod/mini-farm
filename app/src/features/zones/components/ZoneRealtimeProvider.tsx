'use client'

import { useEffect } from 'react'
import { useRealtimeContext } from '@/components/RealtimeContext'
import { useRealtime } from '@/features/dashboard/hooks/useRealtime'

type Props = {
  sensorIds: string[]
  channelKey: string
}

export function ZoneRealtimeProvider({ sensorIds, channelKey }: Props) {
  const { setStatus } = useRealtimeContext()

  const filter = sensorIds.length > 0 ? `sensor_id=in.(${sensorIds.join(',')})` : undefined
  const status = useRealtime({ channelName: `zone-readings-${channelKey}`, filter })

  useEffect(() => {
    setStatus(status)
  }, [status, setStatus])

  return null
}
