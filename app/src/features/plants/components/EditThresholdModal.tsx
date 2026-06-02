'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { ChevronDown, Leaf, Plus, Settings, Trash2, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { upsertThresholds } from '../api/upsertThresholds'
import type { UpsertThresholdsState } from '../api/upsertThresholds'
import { ThresholdScale } from './ThresholdScale'
import { CultivationBadge } from './CultivationBadge'
import { filterSensorsByCultivation } from '../utils/filterSensorsByCultivation'
import type { Plant, PlantThreshold, SensorTypeMaster } from '../types'

const initialState: UpsertThresholdsState = { success: false }

type ThresholdRowState = {
  id: string
  sensorTypeId: string
  alertMin: string
  optimalMin: string
  optimalMax: string
  alertMax: string
}

function parseNum(s: string): number | null {
  if (s.trim() === '') return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function isRowInvalid(row: ThresholdRowState): boolean {
  const alertMin = parseNum(row.alertMin)
  const optimalMin = parseNum(row.optimalMin)
  const optimalMax = parseNum(row.optimalMax)
  const alertMax = parseNum(row.alertMax)

  const vals = [alertMin, optimalMin, optimalMax, alertMax]
  const defined = vals.filter((v) => v !== null) as number[]
  if (defined.length < 2) return false

  const allDefined = alertMin !== null && optimalMin !== null && optimalMax !== null && alertMax !== null
  if (allDefined) {
    return !(alertMin! <= optimalMin! && optimalMin! <= optimalMax! && optimalMax! <= alertMax!)
  }

  if (optimalMin !== null && optimalMax !== null && optimalMin > optimalMax) return true
  if (alertMin !== null && optimalMin !== null && alertMin > optimalMin) return true
  if (optimalMax !== null && alertMax !== null && optimalMax > alertMax) return true

  return false
}

type EditThresholdModalProps = {
  plant: Plant | null
  thresholds: PlantThreshold[]
  sensorTypes: SensorTypeMaster[]
  onClose: () => void
}

export function EditThresholdModal({
  plant,
  thresholds,
  sensorTypes,
  onClose,
}: EditThresholdModalProps) {
  const [state, formAction, isPending] = useActionState(upsertThresholds, initialState)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const [rows, setRows] = useState<ThresholdRowState[]>([])
  const [addDropdownOpen, setAddDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (plant) {
      const relevantSensorTypes = filterSensorsByCultivation(sensorTypes, plant.cultivation_type)
      const existingRows = relevantSensorTypes
        .map((st) => {
          const t = thresholds.find((th) => th.sensor_type_id === st.id)
          if (!t) return null
          return {
            id: st.id,
            sensorTypeId: st.id,
            alertMin: t.alert_min !== null ? String(t.alert_min) : '',
            optimalMin: t.optimal_min !== null ? String(t.optimal_min) : '',
            optimalMax: t.optimal_max !== null ? String(t.optimal_max) : '',
            alertMax: t.alert_max !== null ? String(t.alert_max) : '',
          }
        })
        .filter((r): r is ThresholdRowState => r !== null)
      setRows(existingRows)
    }
  }, [plant, thresholds, sensorTypes])

  useEffect(() => {
    if (state.success) {
      onCloseRef.current()
      // setRows([]) は再マウント後には意味を持たないが、
      // onCloseRef.current() が key の変化を伴わない閉じ方をした場合の防御的クリア
      setRows([])
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

  function handleClose() {
    if (!isPending) onClose()
  }

  const relevantSensorTypes = plant
    ? filterSensorsByCultivation(sensorTypes, plant.cultivation_type)
    : []

  const usedIds = new Set(rows.map((r) => r.sensorTypeId))
  const availableSensorTypes = relevantSensorTypes.filter((st) => !usedIds.has(st.id))

  function addRow(sensorTypeId: string) {
    setRows((prev) => [
      ...prev,
      {
        id: sensorTypeId,
        sensorTypeId,
        alertMin: '',
        optimalMin: '',
        optimalMax: '',
        alertMax: '',
      },
    ])
    setAddDropdownOpen(false)
  }

  function removeRow(sensorTypeId: string) {
    setRows((prev) => prev.filter((r) => r.sensorTypeId !== sensorTypeId))
  }

  function updateRow(
    sensorTypeId: string,
    field: keyof Omit<ThresholdRowState, 'id' | 'sensorTypeId'>,
    value: string
  ) {
    setRows((prev) =>
      prev.map((r) => (r.sensorTypeId === sensorTypeId ? { ...r, [field]: value } : r))
    )
  }

  const hasInvalid = rows.some(isRowInvalid)

  return (
    <Dialog.Root open={!!plant} onOpenChange={(next) => { if (!isPending && !next) handleClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50 bg-[#0f1a14]/45 backdrop-blur-[2px]"
          style={{ animation: 'overlayIn 0.16s ease-out' }}
        />
        <Dialog.Content
          className="fixed left-1/2 top-0 z-50 w-full max-w-[760px] -translate-x-1/2 rounded-2xl bg-white shadow-[0_20px_60px_rgba(15,26,20,.25)] p-0 focus:outline-none my-8"
          style={{ animation: 'modalIn 0.2s cubic-bezier(0.16,1,0.3,1)' }}
          aria-labelledby="edit-threshold-modal-title"
          onPointerDownOutside={(e) => { if (isPending) e.preventDefault() }}
          onEscapeKeyDown={(e) => { if (isPending) e.preventDefault() }}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between border-b border-[#eef1ed] px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ecf5ee] to-[#d6ead9]">
                <Leaf className="h-[19px] w-[19px] text-[#246e3a]" strokeWidth={2} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Dialog.Title id="edit-threshold-modal-title" className="text-[18px] font-semibold tracking-tight text-[#0f1a14]">
                    {plant?.name}
                  </Dialog.Title>
                  {plant && <CultivationBadge type={plant.cultivation_type} />}
                </div>
                <Dialog.Description className="mt-0.5 text-[12px] text-[#8a978f]">
                  センサー種別ごとの適正値・警告閾値を編集
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

          <div className="overflow-y-auto max-h-[64vh] [scrollbar-width:thin] [scrollbar-color:#dfe3dd_transparent]">
            <form id="edit-threshold-form" action={formAction} className="px-6 pt-5 pb-0">
              <input type="hidden" name="plant_id" value={plant?.id} />

              {/* 凡例バー */}
              <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-[#f7f8f6] px-4 py-2.5 text-[11.5px] text-[#4b5a52]">
                <span className="font-medium text-[#0f1a14]">範囲の見方</span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-4 rounded-sm" style={{ backgroundColor: '#2f8a4a' }} />
                  <span>適正範囲</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-4 rounded-sm" style={{ backgroundColor: '#f7e6c4' }} />
                  <span>警告までの余裕</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-4 rounded-sm" style={{ backgroundColor: '#f0d8d4' }} />
                  <span>警告域</span>
                </span>
                <span className="ml-auto font-mono text-[10.5px] text-[#8a978f]">警下限 ≤ 適正下限 ≤ 適正上限 ≤ 警上限</span>
              </div>

              {/* テーブル（ヘッダー＋センサー行） */}
              {rows.length > 0 && (
                <div className="mb-4 overflow-hidden rounded-xl ring-1 ring-[#e6e9e5]">
                  {/* ヘッダー行 */}
                  <div className="grid grid-cols-[88px_repeat(4,1fr)_36px] items-center gap-2 bg-[#f7f8f6] px-3 py-2">
                    <span className="text-[10.5px] font-semibold tracking-wider text-[#8a978f]">
                      センサー
                    </span>
                    {[
                      { label: '警告下限', color: '#b9351f' },
                      { label: '適正下限', color: '#246e3a' },
                      { label: '適正上限', color: '#246e3a' },
                      { label: '警告上限', color: '#b9351f' },
                    ].map(({ label, color }) => (
                      <span
                        key={label}
                        className="text-center text-[10.5px] font-semibold tracking-wider"
                        style={{ color }}
                      >
                        {label}
                      </span>
                    ))}
                    <span />
                  </div>

                  {/* センサー行 */}
                  <div className="divide-y divide-[#eef1ed]">
                    {rows.map((row) => {
                      const st = sensorTypes.find((s) => s.id === row.sensorTypeId)
                      if (!st) return null
                      const invalid = isRowInvalid(row)
                      return (
                        <div
                          key={row.sensorTypeId}
                          className={invalid ? 'bg-[#fceeec]/20' : 'bg-white'}
                        >
                          <input type="hidden" name="sensor_type_id" value={st.id} />
                          <div className="grid grid-cols-[88px_repeat(4,1fr)_36px] items-center gap-2 px-3 py-3">
                            <div className="flex flex-col">
                              <span className="text-[13px] font-medium text-[#0f1a14]">{st.label}</span>
                              {st.unit && (
                                <span className="font-mono text-[10px] text-[#8a978f]">{st.unit}</span>
                              )}
                            </div>
                            {(
                              [
                                { field: 'alertMin' as const, name: `alert_min_${st.id}`, type: 'alert' },
                                { field: 'optimalMin' as const, name: `optimal_min_${st.id}`, type: 'optimal' },
                                { field: 'optimalMax' as const, name: `optimal_max_${st.id}`, type: 'optimal' },
                                { field: 'alertMax' as const, name: `alert_max_${st.id}`, type: 'alert' },
                              ] as const
                            ).map(({ field, name, type }) => (
                              <input
                                key={field}
                                type="number"
                                name={name}
                                step="0.1"
                                value={row[field]}
                                onChange={(e) => updateRow(row.sensorTypeId, field, e.target.value)}
                                className={`w-full rounded-md px-2 py-1.5 text-center font-jetbrains-mono text-[13px] tabular-nums text-[#0f1a14] outline-none ring-1 ring-inset focus-visible:ring-2 ${
                                  invalid
                                    ? 'bg-[#fceeec] ring-[#d6452c] focus-visible:ring-[#d6452c]'
                                    : type === 'alert'
                                      ? 'bg-[#fffaf9] ring-[#f0d8d4] focus-visible:ring-[#d6452c]'
                                      : 'bg-[#fbfdfb] ring-[#d6ead9] focus-visible:ring-[#2f8a4a]'
                                }`}
                                placeholder="–"
                              />
                            ))}
                            <button
                              type="button"
                              onClick={() => removeRow(row.sensorTypeId)}
                              className="grid h-8 w-8 place-items-center rounded-md text-[#8a978f] hover:bg-[#fceeec] hover:text-[#b9351f]"
                              aria-label="この閾値行を削除"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="px-3 pb-3 pr-12">
                            <ThresholdScale
                              alertMin={parseNum(row.alertMin)}
                              optimalMin={parseNum(row.optimalMin)}
                              optimalMax={parseNum(row.optimalMax)}
                              alertMax={parseNum(row.alertMax)}
                              unit={st.unit}
                              isInvalid={invalid}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* センサー追加ドロップダウン */}
              {availableSensorTypes.length > 0 && (
                <div className="relative mt-4" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setAddDropdownOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-[#e6e9e5] bg-white px-3 py-1.5 text-xs font-medium text-[#4b5a52] transition-colors hover:border-[#2f8a4a] hover:text-[#246e3a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    センサーを追加
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {addDropdownOpen && (
                    <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg border border-[#e6e9e5] bg-white py-1 shadow-lg">
                      {availableSensorTypes.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => addRow(st.id)}
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
            </form>
          </div>

          {/* フッター */}
          <div className="flex items-center justify-between gap-2 border-t border-[#eef1ed] px-6 py-4">
            <div>
              {hasInvalid && (
                <span className="text-[11.5px] text-[#8a978f]">値の順序を確認してください</span>
              )}
            </div>
            <div className="flex items-center gap-2">
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
                form="edit-threshold-form"
                disabled={isPending || hasInvalid}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#246e3a] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#1c5a2f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a] disabled:opacity-50"
              >
                <Settings className="h-[14px] w-[14px]" />
                {isPending ? '保存中...' : '変更を保存'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
