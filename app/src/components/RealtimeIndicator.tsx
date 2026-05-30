'use client'

import { useRealtimeContext } from '@/components/RealtimeContext'

export function RealtimeIndicator() {
  const { status } = useRealtimeContext()

  if (status === 'connected') {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-[#ecf5ee] px-3 py-1 text-xs text-green-700">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
        更新中
        <span className="font-jetbrains-mono text-green-500">
          · live
        </span>
      </span>
    )
  }

  if (status === 'connecting') {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
        接続中
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      切断
    </span>
  )
}
