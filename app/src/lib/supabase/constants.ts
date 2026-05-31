import type { CookieOptions } from '@supabase/ssr'

export const SUPABASE_AUTH_STORAGE_KEY = 'mini-farm-auth-token'

export type CookieToSet = { name: string; value: string; options?: CookieOptions }
