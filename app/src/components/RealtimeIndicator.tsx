'use client'

import { Wifi } from 'lucide-react'
import { useRealtimeContext } from '@/components/RealtimeContext'

export function RealtimeIndicator() {
  const { status } = useRealtimeContext()

  if (status === 'connected') {
    return (
      <span className="flex items-center gap-1 text-xs text-green-600">
        <Wifi className="h-3 w-3" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
        更新中
      </span>
    )
  }

  if (status === 'connecting') {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-400">
        <Wifi className="h-3 w-3" />
        <span className="h-2 w-2 rounded-full bg-gray-400" />
        接続中
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1 text-xs text-gray-400">
      <Wifi className="h-3 w-3" />
      <span className="h-2 w-2 rounded-full bg-gray-400" />
      切断
    </span>
  )
}
