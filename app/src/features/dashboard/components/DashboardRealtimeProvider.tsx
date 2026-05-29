'use client'

import { useEffect } from 'react'
import { useRealtimeContext } from '@/components/RealtimeContext'
import { useRealtime } from '../hooks/useRealtime'

export function DashboardRealtimeProvider() {
  const { setStatus } = useRealtimeContext()
  const status = useRealtime({ channelName: 'dashboard-readings' })

  useEffect(() => {
    setStatus(status)
  }, [status, setStatus])

  return null
}
