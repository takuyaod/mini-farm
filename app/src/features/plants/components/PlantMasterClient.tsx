'use client'

import { useState } from 'react'
import { Leaf, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlantCard } from './PlantCard'
import { AddPlantTile } from './AddPlantTile'
import { EmptyState } from './EmptyState'
import { AddPlantModal } from './AddPlantModal'
import { EditPlantModal } from './EditPlantModal'
import { EditThresholdModal } from './EditThresholdModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import type { Plant, PlantThreshold, SensorTypeMaster } from '../types'

type PlantMasterClientProps = {
  plants: Plant[]
  sensorTypes: SensorTypeMaster[]
  thresholdsByPlantId: Record<string, PlantThreshold[]>
}

export function PlantMasterClient({
  plants,
  sensorTypes,
  thresholdsByPlantId,
}: PlantMasterClientProps) {
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null)
  const [editingPlantInfo, setEditingPlantInfo] = useState<Plant | null>(null)
  const [deletingPlant, setDeletingPlant] = useState<Plant | null>(null)

  return (
    <>
      {/* ページヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ecf5ee] to-[#d6ead9]">
            <Leaf className="h-5 w-5 text-[#2f8a4a]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0f1a14]">
              植物マスタ
            </h1>
            <p className="text-sm text-[#4b5a52]">
              {plants.length > 0
                ? `${plants.length}件の植物が登録されています`
                : '植物を追加してセンサー閾値を管理しましょう'}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="green"
          size="default"
          onClick={() => setAddModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          植物を追加
        </Button>
      </div>

      {/* カードグリッド / 空状態 */}
      {plants.length === 0 ? (
        <EmptyState onAddPlant={() => setAddModalOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {plants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              thresholds={thresholdsByPlantId[plant.id] ?? []}
              sensorTypes={sensorTypes}
              onEditThreshold={setEditingPlant}
              onEditPlant={setEditingPlantInfo}
              onDelete={setDeletingPlant}
            />
          ))}
          <AddPlantTile onClick={() => setAddModalOpen(true)} />
        </div>
      )}

      {/* モーダル群 */}
      {/* key={addModalOpen} でオープンするたびに再マウントし、useActionState の state をリセットする */}
      <AddPlantModal
        key={String(addModalOpen)}
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        sensorTypes={sensorTypes}
      />
      {/* key={editingPlantInfo?.id} で編集対象が変わるたびに再マウントし、useActionState の state をリセットする */}
      <EditPlantModal
        key={editingPlantInfo?.id ?? 'none-edit-plant'}
        plant={editingPlantInfo}
        onClose={() => setEditingPlantInfo(null)}
      />
      {/* key={editingPlant?.id} で編集対象が変わるたびに再マウントし、useActionState の state をリセットする */}
      <EditThresholdModal
        key={editingPlant?.id ?? 'none'}
        plant={editingPlant}
        thresholds={editingPlant ? (thresholdsByPlantId[editingPlant.id] ?? []) : []}
        sensorTypes={sensorTypes}
        onClose={() => setEditingPlant(null)}
      />
      <DeleteConfirmModal
        key={deletingPlant?.id}
        plant={deletingPlant}
        onClose={() => setDeletingPlant(null)}
      />
    </>
  )
}
