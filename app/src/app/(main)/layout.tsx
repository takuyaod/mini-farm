import { Suspense } from 'react'
import { Header } from '@/components/Header'
import { getUnresolvedAlertCount } from '@/features/alerts/api/getUnresolvedAlertCount'

async function HeaderWithAlertCount() {
  const alertCount = await getUnresolvedAlertCount()
  return <Header alertCount={alertCount} />
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<Header alertCount={0} />}>
        <HeaderWithAlertCount />
      </Suspense>
      {children}
    </>
  )
}
