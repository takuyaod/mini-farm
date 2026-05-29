'use client'

import { useActionState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { harvestZonePlant, type HarvestState } from '../api/harvestZonePlant'
import type { Plant, ZonePlant } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  zonePlant: ZonePlant & { plants: Plant }
  zoneId: string
}

const initialState: HarvestState = { success: false }

function getDaysFromPlanting(plantedAt: string): number {
  return Math.floor((Date.now() - new Date(plantedAt).getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function HarvestModal({ open, onClose, zonePlant, zoneId }: Props) {
  const [state, formAction, isPending] = useActionState(harvestZonePlant, initialState)

  useEffect(() => {
    if (state.success) {
      onClose()
    }
  }, [state.success, onClose])

  const days = getDaysFromPlanting(zonePlant.planted_at)

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>収穫を記録する</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-4">
          <div className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <p>植付日: {formatDate(zonePlant.planted_at)}</p>
            <p>栽培日数: {days} 日</p>
          </div>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="zone_plant_id" value={zonePlant.id} />
            <input type="hidden" name="zone_id" value={zoneId} />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="harvest-weight" className="text-sm font-medium text-gray-700">
                収穫量 <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="harvest-weight"
                  name="harvest_weight_g"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue="0"
                  required
                  className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">g</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="harvest-notes" className="text-sm font-medium text-gray-700">
                メモ（任意）
              </label>
              <textarea
                id="harvest-notes"
                name="notes"
                rows={3}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ 確定するとこのゾーンの栽培が終了します
            </p>

            {state.error && <p className="text-sm text-red-500">{state.error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isPending ? '記録中...' : '収穫を確定'}
              </button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
