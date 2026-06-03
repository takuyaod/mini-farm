import Link from 'next/link'
import { Bell, Sprout } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { UserMenu } from './UserMenu'
import { RealtimeIndicator } from './RealtimeIndicator'
import { HeaderNav } from './HeaderNav'

type Props = {
  alertCount?: number
  user: User
}

export function Header({ alertCount = 0, user }: Props) {
  return (
    <header className="sticky top-0 z-30 h-14 border-b bg-white/85 px-4 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4">
        {/* ロゴ + Realtimeピル */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-600">
              <Sprout className="h-4 w-4 text-white" />
            </span>
            <span className="text-base font-semibold text-gray-900">Mini Farm</span>
          </Link>
          <RealtimeIndicator />
        </div>

        {/* ナビゲーション */}
        <HeaderNav />

        {/* ベル + アバター */}
        <div className="flex items-center gap-3">
          <Link href="/alerts" className="relative rounded-md p-1 hover:bg-gray-100">
            <Bell className="h-5 w-5 text-gray-600" />
            {alertCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </Link>
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}
