'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createPlant } from '../api/createPlant'
import type { CreatePlantState } from '../api/createPlant'

const initialState: CreatePlantState = { success: false }

export function AddPlantForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, isPending] = useActionState(createPlant, initialState)

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
    }
  }, [state.success])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="plant-name" className="text-sm font-medium text-gray-700">
          植物名 <span className="text-red-500">*</span>
        </label>
        <Input
          id="plant-name"
          name="name"
          type="text"
          placeholder="例: バジル"
          className="focus:border-green-500 focus:ring-green-500"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-gray-700">
          栽培方式 <span className="text-red-500">*</span>
        </span>
        <div className="flex gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="cultivation_type"
              value="hydroponic"
              defaultChecked
              className="accent-green-600"
            />
            水耕
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="cultivation_type"
              value="soil"
              className="accent-green-600"
            />
            土壌
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="cultivation_type"
              value="both"
              className="accent-green-600"
            />
            両方
          </label>
        </div>
      </div>
      {state.error && <p className="text-sm text-red-500">{state.error}</p>}
      {state.success && <p className="text-sm text-green-600">植物を追加しました</p>}
      <Button
        type="submit"
        disabled={isPending}
        className="self-start bg-green-600 hover:bg-green-700"
      >
        <Plus className="h-4 w-4" />
        {isPending ? '追加中...' : '植物を追加'}
      </Button>
    </form>
  )
}
