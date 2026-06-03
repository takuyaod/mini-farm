'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Settings2, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { Button } from '@/components/ui/button'
import { updatePlant } from '../api/updatePlant'
import type { UpdatePlantState } from '../api/updatePlant'
import type { CultivationType, Plant } from '../types'

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
  }, [onClose])

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

  function handleClose() {
    if (!isPending) onClose()
  }

  const nameError = nameTouched && nameValue.trim() === ''

  return (
    <Dialog.Root open={!!plant} onOpenChange={(next) => { if (!isPending && !next) handleClose() }}>
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
                <Settings2 className="h-[19px] w-[19px] text-[#246e3a]" strokeWidth={2} />
              </div>
              <div>
                <Dialog.Title className="text-[18px] font-semibold tracking-tight text-[#0f1a14]">
                  植物を編集
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-[12px] text-[#8a978f]">
                  植物名と栽培方式を変更できます
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

          <form ref={formRef} action={formAction} className="px-6 py-5">
            <input type="hidden" name="plant_id" value={plant?.id} />

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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={isPending}
                className="text-[#4b5a52] hover:bg-[#eef1ed] hover:text-[#0f1a14] focus-visible:ring-green-400"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                variant="green"
                size="sm"
                disabled={isPending || nameValue.trim() === ''}
              >
                <Settings2 className="h-[14px] w-[14px]" />
                {isPending ? '保存中...' : '変更を保存'}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
