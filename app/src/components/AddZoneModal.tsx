'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { createZone } from '@/features/dashboard/api/createZone'
import type { CreateZoneState } from '@/features/dashboard/api/createZone'

const initialState: CreateZoneState = { success: false }

const CULTIVATION_OPTIONS: { value: string; label: string }[] = [
  { value: 'hydroponic', label: '水耕' },
  { value: 'soil', label: '土壌' },
]

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddZoneModal({ open, onOpenChange }: Props) {
  const [state, formAction, isPending] = useActionState(createZone, initialState)
  const onOpenChangeRef = useRef(onOpenChange)
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  }, [onOpenChange])

  const [cultivationType, setCultivationType] = useState('hydroponic')

  useEffect(() => {
    if (state.success) {
      onOpenChangeRef.current(false)
      // フォームのリセットは親の key={String(modalOpen)} による再マウントで行われる
    }
  }, [state.success])

  function handleClose() {
    if (!isPending) onOpenChangeRef.current(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!isPending) onOpenChangeRef.current(next) }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-[#0f1a14]/45 backdrop-blur-[2px]"
          style={{ animation: 'overlayIn 0.16s ease-out' }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-[0_20px_60px_rgba(15,26,20,.25)] p-0 focus:outline-none"
          style={{ animation: 'modalIn 0.2s cubic-bezier(0.16,1,0.3,1)' }}
          onPointerDownOutside={(e) => { if (isPending) e.preventDefault() }}
          onEscapeKeyDown={(e) => { if (isPending) e.preventDefault() }}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between border-b border-[#eef1ed] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ecf5ee] to-[#d6ead9]">
                <Plus className="h-[19px] w-[19px] text-[#246e3a]" strokeWidth={2} />
              </div>
              <div>
                <Dialog.Title
                  className="text-[18px] font-semibold tracking-tight text-[#0f1a14]"
                >
                  ゾーンを追加
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-[12px] text-[#8a978f]">
                  ゾーン名と栽培方式を設定します
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8a978f] hover:bg-[#f7f8f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a]"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form action={formAction} className="px-6 py-5">
            {/* ゾーン名 */}
            <div className="mb-5">
              <label
                htmlFor="zone-name"
                className="mb-1.5 block text-sm font-medium text-[#0f1a14]"
              >
                ゾーン名 <span className="text-[#b9351f]">*</span>
              </label>
              <input
                id="zone-name"
                name="name"
                type="text"
                placeholder="例: 温室A"
                className="w-full rounded-lg border border-[#e6e9e5] bg-white px-3 py-2 text-sm text-[#0f1a14] outline-none transition-shadow placeholder:text-[#8a978f] hover:border-[#c0c9be] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#2f8a4a]"
              />
            </div>

            {/* 栽培方式 */}
            <div className="mb-6">
              <span className="mb-1.5 block text-sm font-medium text-[#0f1a14]">
                栽培方式 <span className="text-[#b9351f]">*</span>
              </span>
              <div className="flex rounded-lg border border-[#e6e9e5] bg-[#f7f8f6] p-1">
                {CULTIVATION_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex-1">
                    <input
                      type="radio"
                      name="type"
                      value={opt.value}
                      checked={cultivationType === opt.value}
                      onChange={() => setCultivationType(opt.value)}
                      className="sr-only"
                    />
                    <span
                      className={`flex cursor-pointer items-center justify-center rounded-md py-1.5 text-sm font-medium transition-all ${
                        cultivationType === opt.value
                          ? 'bg-white text-[#246e3a] shadow-sm ring-1 ring-[#d6ead9]'
                          : 'text-[#4b5a52] hover:text-[#0f1a14]'
                      }`}
                    >
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {state.error && (
              <p className="mb-4 rounded-lg bg-[#fceeec] px-3 py-2 text-sm text-[#b9351f]">
                {state.error}
              </p>
            )}

            {/* フッターボタン */}
            <div className="flex justify-end gap-2 border-t border-[#eef1ed] pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#4b5a52] transition-colors hover:bg-[#eef1ed] hover:text-[#0f1a14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a] disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#246e3a] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#1c5a2f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a] disabled:opacity-50"
              >
                <Plus className="h-[14px] w-[14px]" />
                {isPending ? '作成中...' : '作成'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
