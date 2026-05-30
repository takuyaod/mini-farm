'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateZoneName, type UpdateZoneNameState } from '../api/updateZoneName'

type ZoneSettingsNameProps = {
  zoneId: string
  currentName: string
}

const initialState: UpdateZoneNameState = { success: false }

export function ZoneSettingsName({ zoneId, currentName }: ZoneSettingsNameProps) {
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, formAction, isPending] = useActionState(updateZoneName, initialState)

  useEffect(() => {
    if (state.success) {
      setIsEditing(false)
    }
  }, [state.success])

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const handleCancel = () => {
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-3">
        <span className="flex-1 text-sm text-gray-700">{currentName}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsEditing(true)}
        >
          <Pencil className="h-3.5 w-3.5" />
          編集
        </Button>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="zone_id" value={zoneId} />
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          id="zone-name"
          name="name"
          type="text"
          defaultValue={currentName}
          placeholder="ゾーン名を入力"
          className="flex-1 focus:border-green-500 focus:ring-green-500"
          disabled={isPending}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isPending}
          aria-label="キャンセル"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {state.error && <p className="text-sm text-red-500">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" variant="green" size="sm" disabled={isPending}>
          {isPending ? '保存中...' : '保存'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCancel}
          disabled={isPending}
        >
          キャンセル
        </Button>
      </div>
    </form>
  )
}
