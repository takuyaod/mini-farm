import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const SUPABASE_AUTH_STORAGE_KEY = 'mini-farm-auth-token'

type CookieStore = Awaited<ReturnType<typeof cookies>>
type CookieSetOptions = Parameters<CookieStore['set']>[2]
type CookieToSet = { name: string; value: string; options?: CookieSetOptions }

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

/**
 * OAuth 開始URLの生成専用。
 * ブラウザが遷移するURLは公開到達可能な Supabase URL を使う必要がある。
 */
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
    data: { session },
  } = await supabase.auth.getSession()
  return session?.user ?? null
}

/** Server-side session validation — makes an API call. Use before mutations. */
export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
