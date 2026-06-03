import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SUPABASE_AUTH_STORAGE_KEY, type CookieToSet } from './constants'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
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
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components cannot set cookies — only Route Handlers and Server Actions can
          }
        },
      },
    }
  )
}

/** OAuth 開始URL生成専用。ブラウザが遷移するURLには公開到達可能な Supabase URL を使う。 */
export async function createAuthClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
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
}

/** Local JWT validation — no Supabase API call. Use for read operations. */
export async function getClaims() {
  const supabase = await createClient()
  const {
    data,
  } = await supabase.auth.getClaims()
  return data?.claims ?? null
}

/** Server-side session validation — makes an API call. Use before mutations. */
export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/** Require a verified user before rendering protected pages/layouts. */
export async function requireUser() {
  const user = await getUser()
  if (!user) redirect('/login')
  return user
}
