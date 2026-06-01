'use client'

import { useActionState, useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { deletePlant } from '../api/deletePlant'
import type { DeletePlantState } from '../api/deletePlant'
import type { Plant } from '../types'

const initialState: DeletePlantState = { success: false }

type DeleteConfirmModalProps = {
  plant: Plant | null
  onClose: () => void
}

export function DeleteConfirmModal({ plant, onClose }: DeleteConfirmModalProps) {
  const [state, formAction, isPending] = useActionState(deletePlant, initialState)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (state.success) {
      onCloseRef.current()
    }
  }, [state.success])

  useEffect(() => {
    if (!plant) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) onCloseRef.current()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [plant, isPending])

  useEffect(() => {
    if (plant) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [plant])

  if (!plant) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ animation: 'overlayIn 0.16s ease-out' }}
    >
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => { if (!isPending) onClose() }}
      />

      {/* モーダル本体 */}
      <div
        className="relative z-10 w-full max-w-[420px] rounded-xl bg-white p-6 shadow-xl"
        style={{ animation: 'modalIn 0.2s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        {/* 閉じるボタン */}
        <button
          type="button"
          onClick={() => { if (!isPending) onClose() }}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-md text-[#8a978f] hover:bg-[#f7f8f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a]"
          aria-label="閉じる"
        >
          <X className="h-4 w-4" />
        </button>

        {/* アイコン */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#fceeec]">
          <AlertTriangle className="h-6 w-6 text-[#b9351f]" />
        </div>

        <h2 id="delete-modal-title" className="mb-2 text-[17px] font-semibold tracking-tight text-[#0f1a14]">
          植物を削除しますか？
        </h2>
        <p className="mb-6 text-sm text-[#4b5a52]">
          <span className="font-medium text-[#0f1a14]">{plant.name}</span> と、関連するすべての閾値データが削除されます。この操作は元に戻せません。
        </p>

        {state.error && (
          <p className="mb-4 rounded-lg bg-[#fceeec] px-3 py-2 text-sm text-[#b9351f]">
            {state.error}
          </p>
        )}

        <form action={formAction} className="flex justify-end gap-3">
          <input type="hidden" name="plant_id" value={plant.id} />
          <button
            type="button"
            onClick={() => { if (!isPending) onClose() }}
            disabled={isPending}
            className="rounded-md border border-[#e6e9e5] bg-white px-4 py-2 text-sm font-medium text-[#4b5a52] transition-colors hover:bg-[#f7f8f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a] disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-[#b9351f] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#9a2b18] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b9351f] disabled:opacity-50"
          >
            {isPending ? '削除中...' : '削除する'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes overlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
