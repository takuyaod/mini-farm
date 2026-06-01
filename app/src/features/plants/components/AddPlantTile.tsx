'use client'

import { Plus } from 'lucide-react'

type AddPlantTileProps = {
  onClick: () => void
}

export function AddPlantTile({ onClick }: AddPlantTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[200px] w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#e6e9e5] bg-white transition-all duration-150 hover:border-[#2f8a4a] hover:bg-[#ecf5ee] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#e6e9e5] bg-[#f7f8f6] text-[#8a978f] transition-all duration-150 group-hover:border-[#2f8a4a] group-hover:bg-[#d6ead9] group-hover:text-[#246e3a]">
        <Plus className="h-5 w-5" />
      </div>
      <span className="text-sm font-medium text-[#8a978f] transition-colors duration-150 group-hover:text-[#246e3a]">
        植物を追加
      </span>
    </button>
  )
}
