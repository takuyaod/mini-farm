'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deactivateZone, type DeactivateZoneState } from '../api/deactivateZone'

type ZoneSettingsDangerProps = {
  zoneId: string
}

const initialState: DeactivateZoneState = { success: false }

export function ZoneSettingsDanger({ zoneId }: ZoneSettingsDangerProps) {
  const [confirmed, setConfirmed] = useState(false)
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(async (prev: DeactivateZoneState, formData: FormData) => {
    const result = await deactivateZone(prev, formData)
    if (result.success) {
      router.push('/zones')
    }
    return result
  }, initialState)

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        ゾーンを休止すると、ダッシュボードに表示されなくなります。
        デバイスからのデータ送信も受け付けなくなります。
        休止後は「ゾーン管理」ページからいつでも再開できます。
      </p>

      {!confirmed ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => setConfirmed(true)}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          ゾーンを休止する
        </Button>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm font-medium text-red-700">
            本当にこのゾーンを休止しますか？
          </p>
          <p className="text-xs text-red-600">
            休止後はダッシュボードから非表示になり、このゾーンのデバイスからのデータ送信が拒否されます。
          </p>
          {state.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}
          <form action={formAction} className="flex gap-2">
            <input type="hidden" name="zone_id" value={zoneId} />
            <Button
              type="submit"
              size="sm"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isPending}
            >
              {isPending ? '処理中...' : '休止する'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmed(false)}
              disabled={isPending}
            >
              キャンセル
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
