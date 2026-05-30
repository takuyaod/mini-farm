'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Plant, PlantThreshold, SensorTypeMaster } from '../types'
import { upsertThresholds } from '../api/upsertThresholds'
import type { UpsertThresholdsState } from '../api/upsertThresholds'
import { PlantList } from './PlantList'

const initialState: UpsertThresholdsState = { success: false }

type Props = {
  plants: Plant[]
  sensorTypes: SensorTypeMaster[]
  thresholdsByPlantId: Record<string, PlantThreshold[]>
}

export function ThresholdEditor({ plants, sensorTypes, thresholdsByPlantId }: Props) {
  const [selectedPlantId, setSelectedPlantId] = useState<string | null>(
    plants.length > 0 ? plants[0].id : null
  )
  const [state, formAction, isPending] = useActionState(upsertThresholds, initialState)

  const selectedPlant = plants.find((p) => p.id === selectedPlantId) ?? null
  const thresholds = selectedPlantId ? (thresholdsByPlantId[selectedPlantId] ?? []) : []

  const filteredSensorTypes = selectedPlant
    ? sensorTypes.filter(
        (st) =>
          st.cultivation_type === selectedPlant.cultivation_type ||
          st.cultivation_type === 'both' ||
          selectedPlant.cultivation_type === 'both'
      )
    : []

  const getThreshold = (sensorTypeId: string): PlantThreshold | undefined =>
    thresholds.find((t) => t.sensor_type_id === sensorTypeId)

  return (
    <div className="flex gap-6">
      <aside className="w-48 shrink-0">
        <PlantList
          plants={plants}
          selectedPlantId={selectedPlantId}
          onSelect={(id) => {
            setSelectedPlantId(id)
          }}
        />
      </aside>

      <div className="flex-1">
        {!selectedPlant ? (
          <p className="py-4 text-sm text-gray-500">植物を選択してください</p>
        ) : (
          <form key={selectedPlantId} action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="plant_id" value={selectedPlant.id} />
            {filteredSensorTypes.map((st) => {
              const t = getThreshold(st.id)
              const unit = st.unit ? `（${st.unit}）` : ''
              return (
                <div key={st.id} className="rounded-md border border-gray-200 p-4">
                  <input type="hidden" name="sensor_type_id" value={st.id} />
                  <h4 className="mb-3 text-sm font-medium text-gray-800">
                    {st.label}{unit}
                  </h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-gray-500">適正値</p>
                      <div className="flex items-center gap-2">
                        <Input
                          name={`optimal_min_${st.id}`}
                          type="number"
                          step="0.1"
                          defaultValue={t?.optimal_min ?? ''}
                          placeholder="最小"
                          className="w-24 focus:border-green-500 focus:ring-green-500"
                        />
                        <span className="text-xs text-gray-400">〜</span>
                        <Input
                          name={`optimal_max_${st.id}`}
                          type="number"
                          step="0.1"
                          defaultValue={t?.optimal_max ?? ''}
                          placeholder="最大"
                          className="w-24 focus:border-green-500 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-gray-500">アラート閾値</p>
                      <div className="flex items-center gap-2">
                        <Input
                          name={`alert_min_${st.id}`}
                          type="number"
                          step="0.1"
                          defaultValue={t?.alert_min ?? ''}
                          placeholder="最小"
                          className="w-24 focus:border-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-xs text-gray-400">〜</span>
                        <Input
                          name={`alert_max_${st.id}`}
                          type="number"
                          step="0.1"
                          defaultValue={t?.alert_max ?? ''}
                          placeholder="最大"
                          className="w-24 focus:border-amber-500 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {filteredSensorTypes.length === 0 && (
              <p className="text-sm text-gray-500">対応するセンサー種別がありません</p>
            )}
            {state.error && <p className="text-sm text-red-500">{state.error}</p>}
            {state.success && (
              <p className="text-sm text-green-600">閾値を保存しました</p>
            )}
            {filteredSensorTypes.length > 0 && (
              <Button
                type="submit"
                disabled={isPending}
                className="self-start bg-green-600 hover:bg-green-700"
              >
                {isPending ? '保存中...' : '閾値を保存'}
              </Button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
