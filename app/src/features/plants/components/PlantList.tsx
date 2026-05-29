import type { Plant } from '../types'

const CULTIVATION_LABELS: Record<string, string> = {
  hydroponic: '水耕',
  soil: '土壌',
  both: '両方',
}

type Props = {
  plants: Plant[]
  selectedPlantId: string | null
  onSelect: (id: string) => void
}

export function PlantList({ plants, selectedPlantId, onSelect }: Props) {
  if (plants.length === 0) {
    return (
      <p className="py-4 text-sm text-gray-500">登録されている植物はありません</p>
    )
  }

  const grouped = plants.reduce<Record<string, Plant[]>>((acc, plant) => {
    const key = plant.cultivation_type
    if (!acc[key]) acc[key] = []
    acc[key].push(plant)
    return acc
  }, {})

  const order: Array<'hydroponic' | 'soil' | 'both'> = ['hydroponic', 'soil', 'both']

  return (
    <div className="flex flex-col gap-4">
      {order.map((type) => {
        const group = grouped[type]
        if (!group || group.length === 0) return null
        return (
          <div key={type}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {CULTIVATION_LABELS[type]}
            </h3>
            <ul className="flex flex-col gap-1">
              {group.map((plant) => (
                <li key={plant.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(plant.id)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selectedPlantId === plant.id
                        ? 'bg-green-50 font-medium text-green-700 ring-1 ring-green-300'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {plant.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
