'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { harvestZonePlant, type HarvestState } from '../api/harvestZonePlant'
import { getDaysFromPlanting, formatPlantingDate } from '../utils'
import type { ZonePlant } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  zonePlant: ZonePlant
  zoneId: string
}

const initialState: HarvestState = { success: false }

export function HarvestModal({ open, onClose, zonePlant, zoneId }: Props) {
  const [state, formAction, isPending] = useActionState(harvestZonePlant, initialState)

  const days = getDaysFromPlanting(zonePlant.planted_at)

  // 収穫記録成功後は、モーダルを自動で閉じずに成功メッセージと次のアクション（新作付け開始）を表示する。
  // これは意図的な仕様であり、ユーザーが能動的に操作して閉じる設計にしている。
  if (state.success) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>収穫を記録しました</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <p className="text-sm text-gray-600">このゾーンの栽培が終了しました。</p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={onClose}>
                閉じる
              </Button>
              <Button asChild variant="green">
                <Link href={`/zones/${zoneId}/settings`} onClick={onClose}>
                  新しい作付けを開始する
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isPending && !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>収穫を記録する</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-4">
          <div className="rounded-md bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <p>植付日: {formatPlantingDate(zonePlant.planted_at)}</p>
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
                <Input
                  id="harvest-weight"
                  name="harvest_weight_g"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue="0"
                  required
                  className="w-32"
                />
                <span className="text-sm text-gray-600">g</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="harvest-notes" className="text-sm font-medium text-gray-700">
                メモ（任意）
              </label>
              <Textarea
                id="harvest-notes"
                name="notes"
                rows={3}
              />
            </div>

            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ 確定するとこのゾーンの栽培が終了します
            </p>

            {state.error && <p className="text-sm text-red-500">{state.error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                variant="green"
                disabled={isPending}
              >
                {isPending ? '記録中...' : '収穫を確定'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
