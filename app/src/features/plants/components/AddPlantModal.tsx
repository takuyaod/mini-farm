'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus, Trash2, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { createPlant } from '../api/createPlant'
import type { CreatePlantState } from '../api/createPlant'
import type { CultivationType, SensorTypeMaster } from '../types'
import { filterSensorsByCultivation } from '../utils/filterSensorsByCultivation'

const initialState: CreatePlantState = { success: false }

const CULTIVATION_OPTIONS: { value: CultivationType; label: string }[] = [
  { value: 'hydroponic', label: '水耕' },
  { value: 'soil', label: '土壌' },
  { value: 'both', label: '両対応' },
]

type ThresholdRow = {
  id: string
  sensorTypeId: string
  alertMin: string
  optimalMin: string
  optimalMax: string
  alertMax: string
}

type AddPlantModalProps = {
  open: boolean
  onClose: () => void
  sensorTypes: SensorTypeMaster[]
}

function parseNum(s: string): number | null {
  if (s.trim() === '') return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function isRowInvalid(row: ThresholdRow): boolean {
  const alertMin = parseNum(row.alertMin)
  const optimalMin = parseNum(row.optimalMin)
  const optimalMax = parseNum(row.optimalMax)
  const alertMax = parseNum(row.alertMax)

  const vals = [alertMin, optimalMin, optimalMax, alertMax]
  const defined = vals.filter((v) => v !== null) as number[]
  if (defined.length < 2) return false

  const allDefined =
    alertMin !== null && optimalMin !== null && optimalMax !== null && alertMax !== null
  if (allDefined) {
    return !(
      alertMin! <= optimalMin! &&
      optimalMin! <= optimalMax! &&
      optimalMax! <= alertMax!
    )
  }

  if (optimalMin !== null && optimalMax !== null && optimalMin > optimalMax) return true
  if (alertMin !== null && optimalMin !== null && alertMin > optimalMin) return true
  if (optimalMax !== null && alertMax !== null && optimalMax > alertMax) return true

  return false
}

export function AddPlantModal({ open, onClose, sensorTypes }: AddPlantModalProps) {
  const [state, formAction, isPending] = useActionState(createPlant, initialState)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const [nameTouched, setNameTouched] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [cultivationType, setCultivationType] = useState<CultivationType>('hydroponic')
  const [thresholdRows, setThresholdRows] = useState<ThresholdRow[]>([])
  const [addDropdownOpen, setAddDropdownOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (state.success) {
      onCloseRef.current()
      resetForm()
    }
  }, [state.success])

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    if (!addDropdownOpen) return
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAddDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [addDropdownOpen])

  function resetForm() {
    setNameValue('')
    setNameTouched(false)
    setCultivationType('hydroponic')
    setThresholdRows([])
    formRef.current?.reset()
  }

  function handleClose() {
    if (!isPending) {
      onClose()
      resetForm()
    }
  }

  const filteredSensorTypes = filterSensorsByCultivation(sensorTypes, cultivationType)

  const usedSensorTypeIds = new Set(thresholdRows.map((r) => r.sensorTypeId))
  const availableSensorTypes = filteredSensorTypes.filter(
    (st) => !usedSensorTypeIds.has(st.id)
  )

  function addThresholdRow(sensorTypeId: string) {
    setThresholdRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sensorTypeId,
        alertMin: '',
        optimalMin: '',
        optimalMax: '',
        alertMax: '',
      },
    ])
    setAddDropdownOpen(false)
  }

  function removeThresholdRow(id: string) {
    setThresholdRows((prev) => prev.filter((r) => r.id !== id))
  }

  function updateRow(id: string, field: keyof Omit<ThresholdRow, 'id' | 'sensorTypeId'>, value: string) {
    setThresholdRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    )
  }

  const nameError = nameTouched && nameValue.trim() === ''
  const hasInvalid = thresholdRows.some(isRowInvalid)

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!isPending && !next) handleClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-black/50"
          style={{ animation: 'overlayIn 0.16s ease-out' }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-0 z-50 w-full max-w-[720px] -translate-x-1/2 overflow-y-auto rounded-xl bg-white shadow-xl p-0 focus:outline-none my-8 max-h-[calc(100vh-4rem)]"
          style={{ animation: 'modalIn 0.2s cubic-bezier(0.16,1,0.3,1)' }}
          onPointerDownOutside={(e) => { if (isPending) e.preventDefault() }}
          onEscapeKeyDown={(e) => { if (isPending) e.preventDefault() }}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between border-b border-[#eef1ed] px-6 py-4">
            <Dialog.Title className="text-[17px] font-semibold tracking-tight text-[#0f1a14]">
              植物を追加
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[#8a978f] hover:bg-[#f7f8f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a]"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form ref={formRef} action={formAction} className="px-6 py-5">
            {/* 植物名 */}
            <div className="mb-5">
              <label htmlFor="add-plant-name" className="mb-1.5 block text-sm font-medium text-[#0f1a14]">
                植物名 <span className="text-[#b9351f]">*</span>
              </label>
              <input
                id="add-plant-name"
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
                      onChange={() => {
                        setCultivationType(opt.value)
                        setThresholdRows([])
                      }}
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

            {/* センサー閾値 */}
            {thresholdRows.length > 0 && (
              <div className="mb-4">
                <div className="mb-2 grid grid-cols-[1fr_repeat(4,80px)_32px] items-center gap-2 px-1">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[#8a978f]">
                    センサー
                  </span>
                  {['警下限', '適正下限', '適正上限', '警上限'].map((label) => (
                    <span
                      key={label}
                      className="text-center text-[10.5px] font-semibold uppercase tracking-wider text-[#8a978f]"
                    >
                      {label}
                    </span>
                  ))}
                  <span />
                </div>
                <div className="flex flex-col gap-2">
                  {thresholdRows.map((row) => {
                    const st = sensorTypes.find((s) => s.id === row.sensorTypeId)
                    if (!st) return null
                    const invalid = isRowInvalid(row)
                    return (
                      <div key={row.id} className="flex flex-col gap-1.5">
                        <input type="hidden" name="sensor_type_id" value={st.id} />
                        <div
                          className={`grid grid-cols-[1fr_repeat(4,80px)_32px] items-center gap-2 rounded-lg border px-3 py-2 ${
                            invalid ? 'border-[#f0b4b0] bg-[#fceeec]/30' : 'border-[#eef1ed] bg-[#f7f8f6]'
                          }`}
                        >
                          <span className="text-sm text-[#0f1a14]">
                            {st.label}
                            {st.unit && (
                              <span className="ml-1 text-xs text-[#8a978f]">({st.unit})</span>
                            )}
                          </span>
                          {(
                            [
                              { field: 'alertMin' as const, name: `alert_min_${st.id}` },
                              { field: 'optimalMin' as const, name: `optimal_min_${st.id}` },
                              { field: 'optimalMax' as const, name: `optimal_max_${st.id}` },
                              { field: 'alertMax' as const, name: `alert_max_${st.id}` },
                            ] as const
                          ).map(({ field, name }) => (
                            <input
                              key={field}
                              type="number"
                              name={name}
                              step="0.1"
                              value={row[field]}
                              onChange={(e) => updateRow(row.id, field, e.target.value)}
                              className={`w-full rounded-md border bg-white px-2 py-1 text-center font-jetbrains-mono text-xs tabular-nums text-[#0f1a14] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#2f8a4a] ${
                                invalid ? 'border-[#f0b4b0]' : 'border-[#e6e9e5]'
                              }`}
                              placeholder="–"
                            />
                          ))}
                          <button
                            type="button"
                            onClick={() => removeThresholdRow(row.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-[#8a978f] hover:bg-[#fceeec] hover:text-[#b9351f]"
                            aria-label="この閾値行を削除"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {invalid && (
                          <p className="px-1 text-xs text-[#b9351f]">
                            順序が不正です（警下限 ≤ 適正下限 ≤ 適正上限 ≤ 警上限）
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* センサー追加ドロップダウン */}
            {availableSensorTypes.length > 0 && (
              <div className="relative mb-6" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setAddDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-[#e6e9e5] bg-white px-3 py-1.5 text-xs font-medium text-[#4b5a52] transition-colors hover:border-[#2f8a4a] hover:text-[#246e3a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  センサー閾値を追加
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                {addDropdownOpen && (
                  <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg border border-[#e6e9e5] bg-white py-1 shadow-lg">
                    {availableSensorTypes.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => addThresholdRow(st.id)}
                        className="w-full px-3 py-2 text-left text-sm text-[#0f1a14] hover:bg-[#f7f8f6]"
                      >
                        {st.label}
                        {st.unit && (
                          <span className="ml-1 text-xs text-[#8a978f]">({st.unit})</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {state.error && (
              <p className="mb-4 rounded-lg bg-[#fceeec] px-3 py-2 text-sm text-[#b9351f]">
                {state.error}
              </p>
            )}

            {hasInvalid && (
              <p className="mb-4 text-sm text-[#b9351f]">
                閾値の順序が正しくない行があります。修正してから追加してください。
              </p>
            )}

            {/* フッターボタン */}
            <div className="flex justify-end gap-3 border-t border-[#eef1ed] pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="rounded-md border border-[#e6e9e5] bg-white px-4 py-2 text-sm font-medium text-[#4b5a52] transition-colors hover:bg-[#f7f8f6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a] disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={isPending || nameValue.trim() === '' || hasInvalid}
                className="rounded-md bg-[#246e3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1c5a2f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a] disabled:opacity-50"
              >
                {isPending ? '追加中...' : '植物を追加'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
