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
      {/*
        unstable_cache でキャッシュ済みのカウントを返すため、
        通常はキャッシュヒットによりフォールバックが表示されることはない。
        初回レンダリング時のみフォールバックが表示される可能性があるが、
        alertCount を省略（undefined）することでバッジを非表示にし、
        不正な件数表示を防ぐ。
      */}
      <Suspense fallback={<Header />}>
        <HeaderWithAlertCount />
      </Suspense>
      {children}
    </>
  )
}
