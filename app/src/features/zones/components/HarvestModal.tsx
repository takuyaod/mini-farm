'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
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
      <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-50 bg-[#0f1a14]/45 backdrop-blur-[2px]"
            style={{ animation: 'overlayIn 0.16s ease-out' }}
          />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-[0_20px_60px_rgba(15,26,20,.25)] p-0 focus:outline-none"
            style={{ animation: 'modalIn 0.2s cubic-bezier(0.16,1,0.3,1)' }}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between border-b border-[#eef1ed] px-6 py-4">
              <Dialog.Title className="text-[17px] font-semibold tracking-tight text-[#0f1a14]">
                収穫を記録しました
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#8a978f] hover:bg-[#f7f8f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a]"
                  aria-label="閉じる"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">
              収穫が完了しました。ゾーンの栽培が終了しています。
            </Dialog.Description>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-[#4b5a52]">このゾーンの栽培が終了しました。</p>
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
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !isPending && !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-[#0f1a14]/45 backdrop-blur-[2px]"
          style={{ animation: 'overlayIn 0.16s ease-out' }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-[0_20px_60px_rgba(15,26,20,.25)] p-0 focus:outline-none max-h-[calc(100vh-4rem)] overflow-y-auto"
          style={{ animation: 'modalIn 0.2s cubic-bezier(0.16,1,0.3,1)' }}
          onPointerDownOutside={(e) => { if (isPending) e.preventDefault() }}
          onEscapeKeyDown={(e) => { if (isPending) e.preventDefault() }}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between border-b border-[#eef1ed] px-6 py-4">
            <Dialog.Title className="text-[17px] font-semibold tracking-tight text-[#0f1a14]">
              収穫を記録する
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#8a978f] hover:bg-[#f7f8f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a]"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            収穫量とメモを入力して収穫を確定してください。
          </Dialog.Description>

          <div className="px-6 py-5 space-y-4">
            <div className="rounded-md bg-[#f7f8f6] px-4 py-3 text-sm text-[#4b5a52]">
              <p>植付日: {formatPlantingDate(zonePlant.planted_at)}</p>
              <p>栽培日数: {days} 日</p>
            </div>

            <form action={formAction} className="space-y-4">
              <input type="hidden" name="zone_plant_id" value={zonePlant.id} />
              <input type="hidden" name="zone_id" value={zoneId} />

              <div className="flex flex-col gap-1.5">
                <label htmlFor="harvest-weight" className="text-sm font-medium text-[#0f1a14]">
                  収穫量 <span className="text-[#b9351f]">*</span>
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
                  <span className="text-sm text-[#4b5a52]">g</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="harvest-notes" className="text-sm font-medium text-[#0f1a14]">
                  メモ（任意）
                </label>
                <Textarea
                  id="harvest-notes"
                  name="notes"
                  rows={3}
                />
              </div>

              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                確定するとこのゾーンの栽培が終了します
              </p>

              {state.error && (
                <p className="rounded-lg bg-[#fceeec] px-3 py-2 text-sm text-[#b9351f]">
                  {state.error}
                </p>
              )}

              <div className="flex justify-end gap-2 border-t border-[#eef1ed] pt-4">
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
