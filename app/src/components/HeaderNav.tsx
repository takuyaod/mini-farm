'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'ダッシュボード', href: '/' },
  { label: 'ゾーン', href: '/zones' },
  { label: 'アラート', href: '/alerts' },
  { label: '植物マスタ', href: '/settings/plants' },
]

export function HeaderNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1">
      {navItems.map(({ label, href }) => {
        const isActive =
          href === '/' ? pathname === '/' : pathname.startsWith(href)

        return (
          <Link
            key={href}
            href={href}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-[#eef1ed] text-gray-900'
                : 'text-gray-600 hover:bg-[#eef1ed] hover:text-gray-900'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
