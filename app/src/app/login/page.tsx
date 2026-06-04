import { LogIn } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase/server'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { error, next } = await searchParams

  async function signInWithGitHub() {
    'use server'
    const supabase = await createAuthClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
    const rawNext = next ?? '/'
    // Prevent open redirect: only allow relative paths (no protocol-relative URLs)
    const safeNext =
      rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      },
    })

    if (oauthError || !data.url) {
      redirect('/login?error=oauth_error')
    }

    redirect(data.url)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-8 rounded-xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            ミニ農園モニタリング
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            アカウントにログインしてください
          </p>
        </div>
        <form action={signInWithGitHub}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700"
          >
            <LogIn className="h-4 w-4" />
            GitHub でログイン
          </button>
        </form>
        {error === 'unauthorized' && (
          <p className="text-center text-sm text-red-600">
            このGitHubアカウントでのログインは許可されていません。管理者に連絡してください。
          </p>
        )}
        {error && error !== 'unauthorized' && (
          <p className="text-center text-sm text-red-600">
            ログインに失敗しました。もう一度お試しください。
          </p>
        )}
      </div>
    </div>
  )
}
