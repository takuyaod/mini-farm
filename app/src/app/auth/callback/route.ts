import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SUPABASE_AUTH_STORAGE_KEY, type CookieToSet } from '@/lib/supabase/constants'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const rawNext = url.searchParams.get('next') ?? '/'
  // Prevent open redirect: only allow relative paths (no protocol-relative URLs)
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.SUPABASE_INTERNAL_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          storageKey: SUPABASE_AUTH_STORAGE_KEY,
        },
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // 許可リスト判定
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user
      const email = user?.email ?? ''
      const githubUsername = (user?.user_metadata?.user_name as string) ?? ''

      const allowedEmailsRaw = process.env.ALLOWED_EMAILS ?? ''
      const allowedUsernamesRaw = process.env.ALLOWED_GITHUB_USERNAMES ?? ''

      // ALLOWED_EMAILS が未設定の場合は全員拒否
      if (!allowedEmailsRaw.trim()) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
      }

      const allowedEmails = allowedEmailsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      const allowedUsernames = allowedUsernamesRaw.split(',').map((s) => s.trim()).filter(Boolean)

      const isAllowed =
        (email && allowedEmails.includes(email)) ||
        (githubUsername && allowedUsernames.includes(githubUsername))

      if (!isAllowed) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?error=unauthorized', request.url))
      }

      return NextResponse.redirect(new URL(next, request.url))
    }

    console.error('auth callback exchange failed', {
      message: error.message,
      code: error.code,
      status: error.status,
    })
  }

  return NextResponse.redirect(new URL('/login?error=auth_code_error', request.url))
}
