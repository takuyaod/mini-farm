import Link from 'next/link'
import { Bell } from 'lucide-react'
import { getClaims } from '@/lib/supabase/server'
import { UserMenu } from './UserMenu'

type Props = {
  alertCount?: number
}

export async function Header({ alertCount = 0 }: Props) {
  const user = await getClaims()

  return (
    <header className="border-b bg-white px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-semibold text-gray-900">
            ミニ農園モニタリング
          </Link>
          <span className="flex items-center gap-1 text-xs text-green-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            更新中
          </span>
        </div>
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
