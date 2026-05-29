'use client'

import Link from 'next/link'
import { ChevronLeft, AlertTriangle } from 'lucide-react'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ZoneDetailError({ error, reset }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-3xl px-4 py-12 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
        <h1 className="mt-4 text-lg font-semibold text-gray-900">
          ゾーン情報の読み込みに失敗しました
        </h1>
        <p className="mt-2 text-sm text-gray-500">{error.message}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            再試行
          </button>
          <Link
            href="/"
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
            ホームへ戻る
          </Link>
        </div>
      </main>
    </div>
  )
}
