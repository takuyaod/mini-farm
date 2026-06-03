import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { SUPABASE_AUTH_STORAGE_KEY, type CookieToSet } from '@/lib/supabase/constants'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  function redirectWithAuthCookies(url: URL) {
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })
    return redirectResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Local JWT validation when possible, falling back to Auth server validation.
  // Cannot use getClaims() from lib/supabase/server here because that helper
  // depends on cookies() from next/headers, which is unavailable in middleware context.
  const {
    data,
  } = await supabase.auth.getClaims()
  const claims = data?.claims ?? null

  const pathname = request.nextUrl.pathname
  const isPublicPath =
    pathname === '/login' || pathname.startsWith('/auth/')

  if (!claims && !isPublicPath) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search)
    return redirectWithAuthCookies(loginUrl)
  }

  if (claims && pathname === '/login') {
    const homeUrl = new URL('/', request.url)
    return redirectWithAuthCookies(homeUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
