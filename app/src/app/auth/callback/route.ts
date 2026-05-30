import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SUPABASE_AUTH_STORAGE_KEY = 'mini-farm-auth-token'
type CookieStore = Awaited<ReturnType<typeof cookies>>
type CookieSetOptions = Parameters<CookieStore['set']>[2]
type CookieToSet = { name: string; value: string; options?: CookieSetOptions }

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
