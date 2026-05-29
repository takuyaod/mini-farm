import { LogIn } from 'lucide-react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  async function signInWithGitHub() {
    'use server'
    const supabase = await createClient()
    const headersList = await headers()
    const origin = headersList.get('origin') ?? 'http://localhost:3000'

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    })

    if (error || !data.url) {
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
        {error && (
          <p className="text-center text-sm text-red-600">
            ログインに失敗しました。もう一度お試しください。
          </p>
        )}
      </div>
    </div>
  )
}
