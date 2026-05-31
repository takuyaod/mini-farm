'use client'

import Image from 'next/image'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Props = {
  user: User | null
}

export function UserMenu({ user }: Props) {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-200 hover:ring-2 hover:ring-gray-300 focus:outline-none">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={fullName ?? 'avatar'} width={32} height={32} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-gray-600">{initial}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {user && (
          <DropdownMenuLabel className="border-b">
            {fullName && <p className="text-sm font-medium text-gray-900">{fullName}</p>}
            <p className="truncate text-xs text-gray-500">{user.email}</p>
          </DropdownMenuLabel>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
