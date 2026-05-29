'use client'

import { useActionState, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createZone } from '@/features/dashboard/api/createZone'
import type { CreateZoneState } from '@/features/dashboard/api/createZone'

const initialState: CreateZoneState = { success: false }

export function AddZoneModal() {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(createZone, initialState)

  useEffect(() => {
    if (state.success) {
      setOpen(false)
    }
  }, [state.success])

  const handleOpenChange = (next: boolean) => {
    if (!isPending) setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 p-6 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-600">
          <Plus className="h-4 w-4" />
          ゾーンを追加
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ゾーンを追加</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="mt-2 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="zone-name" className="text-sm font-medium text-gray-700">
              ゾーン名 <span className="text-red-500">*</span>
            </label>
            <input
              id="zone-name"
              name="name"
              type="text"
              placeholder="例: 温室A"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                  name="type"
                  value="hydroponic"
                  defaultChecked
                  className="accent-blue-600"
                />
                水耕
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="type"
                  value="soil"
                  className="accent-blue-600"
                />
                土壌
              </label>
            </div>
          </div>
          {state.error && <p className="text-sm text-red-500">{state.error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
