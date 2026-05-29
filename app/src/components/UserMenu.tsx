'use client'

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

type Props = {
  user: User | null
}

export function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined
  const fullName = user?.user_metadata?.full_name as string | undefined
  const initial = (fullName ?? user?.email ?? 'U').charAt(0).toUpperCase()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-200 hover:ring-2 hover:ring-gray-300 focus:outline-none"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt={fullName ?? 'avatar'} className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-semibold text-gray-600">{initial}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border bg-white shadow-lg">
            {user && (
              <div className="border-b px-4 py-3">
                {fullName && <p className="text-sm font-medium text-gray-900">{fullName}</p>}
                <p className="truncate text-xs text-gray-500">{user.email}</p>
              </div>
            )}
            <div className="py-1">
              <button
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                ログアウト
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
