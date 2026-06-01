'use client'

import { Leaf, Pencil, Trash2 } from 'lucide-react'
import { ThresholdScale } from './ThresholdScale'
import { CultivationBadge } from './CultivationBadge'
import { filterSensorsByCultivation } from '../utils/filterSensorsByCultivation'
import type { Plant, PlantThreshold, SensorTypeMaster } from '../types'

type PlantCardProps = {
  plant: Plant
  thresholds: PlantThreshold[]
  sensorTypes: SensorTypeMaster[]
  onEditThreshold: (plant: Plant) => void
  onDelete: (plant: Plant) => void
}

export function PlantCard({
  plant,
  thresholds,
  sensorTypes,
  onEditThreshold,
  onDelete,
}: PlantCardProps) {
  const relevantSensorTypes = filterSensorsByCultivation(sensorTypes, plant.cultivation_type)

  const thresholdsWithSensor = relevantSensorTypes
    .map((st) => ({
      sensorType: st,
      threshold: thresholds.find((t) => t.sensor_type_id === st.id) ?? null,
    }))
    .filter((item) => item.threshold !== null)

  return (
    <div className="group flex flex-col rounded-xl border border-[#e6e9e5] bg-white ring-1 ring-transparent transition-all duration-200 hover:[box-shadow:0_6px_20px_rgba(15,26,20,.08)]">
      {/* カードヘッダー */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ecf5ee] to-[#d6ead9]">
          <Leaf className="h-5 w-5 text-[#2f8a4a]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold tracking-tight text-[#0f1a14]">
            {plant.name}
          </h3>
          <div className="mt-1">
            <CultivationBadge type={plant.cultivation_type} />
          </div>
        </div>
      </div>

      {/* 閾値サマリー */}
      <div className="flex-1 border-t border-[#eef1ed] px-4 py-3">
        {thresholdsWithSensor.length === 0 ? (
          <p className="text-xs text-[#8a978f]">閾値が設定されていません</p>
        ) : (
          <div className="flex flex-col gap-3">
            {thresholdsWithSensor.slice(0, 3).map(({ sensorType, threshold }) => (
              <div key={sensorType.id}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-[#4b5a52]">
                    {sensorType.label}
                    {sensorType.unit && (
                      <span className="ml-1 text-[#8a978f]">({sensorType.unit})</span>
                    )}
                  </span>
                </div>
                <ThresholdScale
                  alertMin={threshold!.alert_min}
                  optimalMin={threshold!.optimal_min}
                  optimalMax={threshold!.optimal_max}
                  alertMax={threshold!.alert_max}
                  unit={sensorType.unit}
                />
              </div>
            ))}
            {thresholdsWithSensor.length > 3 && (
              <p className="text-xs text-[#8a978f]">
                他 {thresholdsWithSensor.length - 3} 件
              </p>
            )}
          </div>
        )}
      </div>

      {/* カードフッター */}
      <div className="flex items-center justify-between border-t border-[#eef1ed] px-4 py-3">
        <button
          type="button"
          onClick={() => onEditThreshold(plant)}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#e6e9e5] bg-white px-3 py-1.5 text-xs font-medium text-[#4b5a52] transition-colors hover:border-[#246e3a] hover:text-[#246e3a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f8a4a]"
        >
          <Pencil className="h-3.5 w-3.5" />
          閾値を編集
        </button>
        <button
          type="button"
          onClick={() => onDelete(plant)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[#8a978f] transition-colors hover:bg-[#fceeec] hover:text-[#b9351f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b9351f]"
          aria-label={`${plant.name}を削除`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
