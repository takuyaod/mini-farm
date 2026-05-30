import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_AUTH_STORAGE_KEY = 'mini-farm-auth-token'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        storageKey: SUPABASE_AUTH_STORAGE_KEY,
      },
    }
  )
}
