'use client'

import { useActionState, useEffect, useRef } from 'react'
import { startCultivation, type StartCultivationState } from '../api/startCultivation'
import type { Plant } from '@/features/dashboard/types'

type Props = {
  zoneId: string
  plants: Plant[]
}

const initialState: StartCultivationState = { success: false }

export function ZoneSettingsPlant({ zoneId, plants }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, isPending] = useActionState(startCultivation, initialState)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
    }
  }, [state.success])

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="zone_id" value={zoneId} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="plant-select" className="text-sm font-medium text-gray-700">
          植物 <span className="text-red-500">*</span>
        </label>
        <select
          id="plant-select"
          name="plant_id"
          required
          defaultValue=""
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
        >
          <option value="" disabled>
            選択してください
          </option>
          {plants.map((plant) => (
            <option key={plant.id} value={plant.id}>
              {plant.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="planted-at" className="text-sm font-medium text-gray-700">
          植付日 <span className="text-red-500">*</span>
        </label>
        <input
          id="planted-at"
          name="planted_at"
          type="date"
          defaultValue={today}
          required
          className="w-44 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
        />
      </div>
      {state.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state.success && <p className="text-sm text-green-600">作付けを開始しました</p>}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {isPending ? '登録中...' : '作付けを開始'}
      </button>
    </form>
  )
}
