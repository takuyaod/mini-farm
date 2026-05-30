'use client'

import { useState } from 'react'
import { RefreshCw, Download, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="ring-1 ring-inset ring-[#e6e9e5] hover:bg-[#f7f8f6]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            更新
          </Button>
          <div title="準備中">
            <Button
              variant="outline"
              size="sm"
              disabled
              aria-label="エクスポート（準備中）"
              className="ring-1 ring-inset ring-[#e6e9e5]"
            >
              <Download className="h-3.5 w-3.5" />
              エクスポート
            </Button>
          </div>
          <Button
            variant="green"
            size="sm"
            onClick={() => setModalOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            ゾーンを追加
          </Button>
        </div>
      </div>
      <AddZoneModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
