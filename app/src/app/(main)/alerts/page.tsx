import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, Search, Download, BellOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getAlerts, getAlertSummary } from '@/features/alerts/api/getAlerts'
import { AlertFilters } from '@/features/alerts/components/AlertFilters'
import { AlertSummaryCards } from '@/features/alerts/components/AlertSummaryCards'

export const metadata: Metadata = {
  title: 'アラート | ミニ農園モニタリング',
}

export default async function AlertsPage() {
  const supabase = await createClient()

  const [initialData, zonesResult, summary] = await Promise.all([
    getAlerts({ tab: 'unresolved' }),
    supabase.from('zones').select('id, name').order('created_at', { ascending: true }),
    getAlertSummary(),
  ])

  const zones = (zonesResult.data ?? []) as { id: string; name: string }[]

  return (
    <div className="min-h-screen bg-surface-bg">
      <main className="mx-auto max-w-[1400px] px-8 py-7">
        {/* ページヘッダー行 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            {/* パンくずリスト */}
            <nav className="mb-1 flex items-center gap-1 text-[12px] text-[#8a978f]">
              <Link
                href="/"
                className="transition-colors hover:text-[#4b5a52]"
              >
                ダッシュボード
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#4b5a52]">アラート</span>
            </nav>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0f1a14]">
              アラート
            </h1>
          </div>

          {/* アクションボタン群 */}
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-2 text-[13px] font-medium text-[#4b5a52] transition-colors hover:bg-white"
              disabled
              title="検索（準備中）"
            >
              <Search className="h-4 w-4" />
              検索
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-2 text-[13px] font-medium text-[#4b5a52] transition-colors hover:bg-white"
              disabled
              title="CSV出力（準備中）"
            >
              <Download className="h-4 w-4" />
              CSV出力
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-3 py-2 text-[13px] font-medium text-[#4b5a52] transition-colors hover:bg-white"
              disabled
              title="通知設定（準備中）"
            >
              <BellOff className="h-4 w-4" />
              通知設定
            </button>
          </div>
        </div>

        {/* サマリーカード4枚 */}
        <AlertSummaryCards summary={summary} />

        {/* フィルター＋アラート一覧 */}
        <div className="rounded-xl bg-white border border-surface-border p-6 shadow-[0_1px_0_rgba(15,26,20,.02),0_1px_2px_rgba(15,26,20,.04)]">
          <AlertFilters
            initialAlerts={initialData.alerts}
            initialTotalCount={initialData.totalCount}
            zones={zones}
          />
        </div>
      </main>
    </div>
  )
}
