'use client'

import { useState } from 'react'
import { RefreshCw, Download, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AddZoneModal } from './AddZoneModal'

type Props = {
  zoneCount: number
  today: string
}

export function DashboardHeader({ zoneCount, today }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)

  const handleRefresh = () => {
    router.refresh()
  }

  return (
    <>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            ダッシュボード
          </p>
          <p className="mt-0.5 text-sm text-gray-500">
            {today} &middot; {zoneCount} ゾーンを監視中
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-[#e6e9e5] hover:bg-[#f7f8f6]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            更新
          </button>
          <div title="準備中">
            <button
              type="button"
              disabled
              aria-label="エクスポート（準備中）"
              className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-400 ring-1 ring-inset ring-[#e6e9e5] opacity-50 cursor-not-allowed"
            >
              <Download className="h-3.5 w-3.5" />
              エクスポート
            </button>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-[#246e3a] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1c5a2f]"
          >
            <Plus className="h-3.5 w-3.5" />
            ゾーンを追加
          </button>
        </div>
      </div>
      <AddZoneModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
