'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Settings2, X } from 'lucide-react'
import { updatePlant } from '../api/updatePlant'
import type { UpdatePlantState } from '../api/updatePlant'
import type { CultivationType, Plant } from '../types'
import '../styles/modal-animations.css'

const initialState: UpdatePlantState = { success: false }

const CULTIVATION_OPTIONS: { value: CultivationType; label: string }[] = [
  { value: 'hydroponic', label: '水耕' },
  { value: 'soil', label: '土壌' },
  { value: 'both', label: '両対応' },
]

type EditPlantModalProps = {
  plant: Plant | null
  onClose: () => void
}

export function EditPlantModal({ plant, onClose }: EditPlantModalProps) {
  const [state, formAction, isPending] = useActionState(updatePlant, initialState)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  const [nameTouched, setNameTouched] = useState(false)
  const [nameValue, setNameValue] = useState(plant?.name ?? '')
  const [cultivationType, setCultivationType] = useState<CultivationType>(
    plant?.cultivation_type ?? 'hydroponic'
  )
  const formRef = useRef<HTMLFormElement>(null)

  // plant が切り替わったときにフォームを初期化する
  useEffect(() => {
    if (plant) {
      setNameValue(plant.name)
      setCultivationType(plant.cultivation_type)
      setNameTouched(false)
    }
  }, [plant])

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

  const nameError = nameTouched && nameValue.trim() === ''

  function handleClose() {
    if (!isPending) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ animation: 'overlayIn 0.16s ease-out' }}
    >
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-[#0f1a14]/45 backdrop-blur-[2px]"
        onClick={handleClose}
      />

      {/* モーダル本体 */}
      <div
        className="relative z-10 w-full max-w-[480px] rounded-2xl bg-white shadow-[0_20px_60px_rgba(15,26,20,.25)]"
        style={{ animation: 'modalIn 0.2s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-plant-modal-title"
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b border-[#eef1ed] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ecf5ee] to-[#d6ead9]">
              <Settings2 className="h-[19px] w-[19px] text-[#246e3a]" strokeWidth={2} />
            </div>
            <div>
              <h2 id="edit-plant-modal-title" className="text-[18px] font-semibold tracking-tight text-[#0f1a14]">
                植物を編集
              </h2>
              <p className="mt-0.5 text-[12px] text-[#8a978f]">
                植物名と栽培方式を変更できます
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8a978f] hover:bg-[#f7f8f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a]"
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form ref={formRef} action={formAction} className="px-6 py-5">
          <input type="hidden" name="plant_id" value={plant.id} />

          {/* 植物名 */}
          <div className="mb-5">
            <label htmlFor="edit-plant-name" className="mb-1.5 block text-sm font-medium text-[#0f1a14]">
              植物名 <span className="text-[#b9351f]">*</span>
            </label>
            <input
              id="edit-plant-name"
              name="name"
              type="text"
              placeholder="例: バジル"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={() => setNameTouched(true)}
              maxLength={100}
              className={`w-full rounded-lg border px-3 py-2 text-sm text-[#0f1a14] outline-none transition-shadow placeholder:text-[#8a978f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#2f8a4a] ${
                nameError
                  ? 'border-[#b9351f] bg-[#fceeec]'
                  : 'border-[#e6e9e5] bg-white hover:border-[#c0c9be]'
              }`}
            />
            {nameError && (
              <p className="mt-1 text-xs text-[#b9351f]">植物名を入力してください</p>
            )}
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
                    name="cultivation_type"
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
              disabled={isPending || nameValue.trim() === ''}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#246e3a] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#1c5a2f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a] disabled:opacity-50"
            >
              <Settings2 className="h-[14px] w-[14px]" />
              {isPending ? '保存中...' : '変更を保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
