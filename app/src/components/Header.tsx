import { Bell } from 'lucide-react'
import Link from 'next/link'

export function Header() {
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
          </Link>
          <div className="h-8 w-8 rounded-full bg-gray-200" />
        </div>
      </div>
    </header>
  )
}
