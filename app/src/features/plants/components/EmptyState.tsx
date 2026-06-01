'use client'

import { Leaf, Plus } from 'lucide-react'

type EmptyStateProps = {
  onAddPlant: () => void
}

export function EmptyState({ onAddPlant }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-[#e6e9e5] bg-white px-8 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ecf5ee] to-[#d6ead9]">
        <Leaf className="h-8 w-8 text-[#2f8a4a]" />
      </div>
      <h3 className="mb-2 text-base font-semibold tracking-tight text-[#0f1a14]">
        植物が登録されていません
      </h3>
      <p className="mb-6 max-w-xs text-sm text-[#4b5a52]">
        最初の植物を追加して、センサー閾値を設定しましょう。
      </p>
      <button
        type="button"
        onClick={onAddPlant}
        className="inline-flex items-center gap-2 rounded-lg bg-[#246e3a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1c5a2f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a]"
      >
        <Plus className="h-4 w-4" />
        植物を追加
      </button>
    </div>
  )
}
