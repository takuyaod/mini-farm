'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export type RealtimeStatus = 'connecting' | 'connected' | 'disconnected'

type UseRealtimeOptions = {
  channelName: string
  filter?: string
  enabled?: boolean
}

export function useRealtime({ channelName, filter, enabled = true }: UseRealtimeOptions): RealtimeStatus {
  const router = useRouter()
  const [status, setStatus] = useState<RealtimeStatus>('connecting')

  useEffect(() => {
    if (!enabled) {
      setStatus('disconnected')
      return
    }

    const supabase = createClient()

    const channelConfig = filter
      ? { event: 'INSERT' as const, schema: 'public', table: 'readings', filter }
      : { event: 'INSERT' as const, schema: 'public', table: 'readings' }

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', channelConfig, () => {
        router.refresh()
      })
      .subscribe((realtimeStatus) => {
        if (realtimeStatus === 'SUBSCRIBED') {
          setStatus('connected')
        } else if (realtimeStatus === 'CLOSED' || realtimeStatus === 'CHANNEL_ERROR') {
          setStatus('disconnected')
        } else {
          setStatus('connecting')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelName, filter, enabled, router])

  return status
}
