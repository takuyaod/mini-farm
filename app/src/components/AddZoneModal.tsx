'use client'

import { useActionState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createZone } from '@/features/dashboard/api/createZone'
import type { CreateZoneState } from '@/features/dashboard/api/createZone'

const initialState: CreateZoneState = { success: false }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddZoneModal({ open, onOpenChange }: Props) {
  const [state, formAction, isPending] = useActionState(createZone, initialState)
  const onOpenChangeRef = useRef(onOpenChange)
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange
  })

  useEffect(() => {
    if (state.success) {
      onOpenChangeRef.current(false)
      // フォームのリセットは親の key={String(modalOpen)} による再マウントで行われる
    }
  }, [state.success])

  const handleOpenChange = (next: boolean) => {
    if (!isPending) {
      onOpenChange(next)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ゾーンを追加</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="mt-2 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="zone-name" className="text-sm font-medium text-gray-700">
              ゾーン名 <span className="text-red-500">*</span>
            </label>
            <Input
              id="zone-name"
              name="name"
              type="text"
              placeholder="例: 温室A"
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
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isPending ? '作成中...' : '作成'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
