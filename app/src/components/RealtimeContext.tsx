'use client'

import { createContext, useContext, useState } from 'react'
import type { RealtimeStatus } from '@/features/dashboard/hooks/useRealtime'

type RealtimeContextValue = {
  status: RealtimeStatus
  setStatus: (status: RealtimeStatus) => void
}

const RealtimeContext = createContext<RealtimeContextValue>({
  status: 'connecting',
  setStatus: () => {},
})

export function RealtimeContextProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RealtimeStatus>('connecting')

  return (
    <RealtimeContext.Provider value={{ status, setStatus }}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtimeContext() {
  return useContext(RealtimeContext)
}
