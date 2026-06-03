import { Suspense } from 'react'
import type { User } from '@supabase/supabase-js'
import { Header } from '@/components/Header'
import { getUnresolvedAlertCount } from '@/features/alerts/api/getUnresolvedAlertCount'
import { requireUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function HeaderWithAlertCount({ user }: { user: User }) {
  const alertCount = await getUnresolvedAlertCount()
  return <Header alertCount={alertCount} user={user} />
}

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <>
      {/*
        unstable_cache でキャッシュ済みのカウントを返すため、
        通常はキャッシュヒットによりフォールバックが表示されることはない。
        初回レンダリング時のみフォールバックが表示される可能性があるが、
        alertCount を省略（undefined）することでバッジを非表示にし、
        不正な件数表示を防ぐ。
      */}
      <Suspense fallback={<Header user={user} />}>
        <HeaderWithAlertCount user={user} />
      </Suspense>
      {children}
    </>
  )
}
