'use client'

import { useState, useTransition } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { harvestZone } from '../api/harvestZone'
import type { ZonePlant } from '../types'

type Props = {
  isOpen: boolean
  onClose: () => void
  zonePlant: ZonePlant
  zoneId: string
}

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function HarvestModal({ isOpen, onClose, zonePlant, zoneId }: Props) {
  const [weight, setWeight] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isOpen) return null

  const daysPlanted = daysSince(zonePlant.planted_at)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const weightNum = weight === '' ? null : parseInt(weight, 10)
    if (weightNum !== null && (isNaN(weightNum) || weightNum < 0)) {
      setError('収穫量は0以上の整数を入力してください')
      return
    }

    startTransition(async () => {
      try {
        await harvestZone(zonePlant.id, weightNum, notes || null, zoneId)
        onClose()
      } catch {
        setError('収穫の記録に失敗しました。もう一度お試しください。')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">収穫を記録する</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* 栽培情報 */}
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>植付日</span>
              <span className="font-medium text-gray-900">{formatDate(zonePlant.planted_at)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>栽培日数</span>
              <span className="font-medium text-gray-900">{daysPlanted} 日</span>
            </div>
          </div>

          {/* 収穫量 */}
          <div>
            <label htmlFor="harvest-weight" className="block text-sm font-medium text-gray-700">
              収穫量 <span className="text-red-500">*</span>
            </label>
            <div className="mt-1 flex items-center gap-2">
              <input
                id="harvest-weight"
                type="number"
                min="0"
                step="1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <span className="shrink-0 text-sm text-gray-600">g</span>
            </div>
          </div>

          {/* メモ */}
          <div>
            <label htmlFor="harvest-notes" className="block text-sm font-medium text-gray-700">
              メモ <span className="text-gray-400">（任意）</span>
            </label>
            <textarea
              id="harvest-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="収穫の記録、感想など"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
            />
          </div>

          {/* 警告文 */}
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>確定するとこのゾーンの栽培が終了します</span>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* ボタン */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? '処理中...' : '収穫を確定する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
