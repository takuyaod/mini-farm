'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Key, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addDevice, type AddDeviceState } from '../api/addDevice'
import { reissueApiKey, type ReissueApiKeyState } from '../api/reissueApiKey'
import type { Device } from '@/features/dashboard/types'

// ---- Add Device Form ----

type AddDeviceFormProps = {
  zoneId: string
}

const initialAddState: AddDeviceState = { success: false }

export function AddDeviceForm({ zoneId }: AddDeviceFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, isPending] = useActionState(addDevice, initialAddState)

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset()
    }
  }, [state.success])

  return (
    <div className="space-y-4">
      <form ref={formRef} action={formAction} className="space-y-4">
        <input type="hidden" name="zone_id" value={zoneId} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="device-name" className="text-sm font-medium text-gray-700">
            デバイス名（任意）
          </label>
          <Input
            id="device-name"
            name="name"
            type="text"
            placeholder="例: 温度センサーユニット01"
            className="focus:border-green-500 focus:ring-green-500"
          />
        </div>
        {state.error && <p className="text-sm text-red-500">{state.error}</p>}
        <Button
          type="submit"
          disabled={isPending}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          {isPending ? '追加中...' : 'デバイスを追加'}
        </Button>
      </form>
      {state.success && state.apiKey && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
          <p className="mb-1 text-sm font-medium text-amber-800">デバイスを追加しました</p>
          <p className="mb-2 text-xs text-amber-700">
            ⚠ APIキーは一度しか表示されません。必ずコピーして保存してください。
          </p>
          <code className="block break-all rounded bg-amber-100 px-3 py-2 font-mono text-xs text-amber-900">
            {state.apiKey}
          </code>
        </div>
      )}
    </div>
  )
}

// ---- Reissue API Key Form (per device) ----

type ReissueFormProps = {
  device: Device
}

const initialReissueState: ReissueApiKeyState = { success: false }

function ReissueApiKeyForm({ device }: ReissueFormProps) {
  const [state, formAction, isPending] = useActionState(reissueApiKey, initialReissueState)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="flex-1 text-sm text-gray-700">
          {device.name ?? `デバイス (${device.id.slice(0, 8)}...)`}
        </span>
        <form action={formAction}>
          <input type="hidden" name="device_id" value={device.id} />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={isPending}
          >
            <Key className="h-3.5 w-3.5" />
            {isPending ? '発行中...' : '再発行'}
          </Button>
        </form>
      </div>
      {state.error && <p className="text-xs text-red-500">{state.error}</p>}
      {state.success && state.apiKey && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="mb-1 text-xs text-amber-700">
            ⚠ APIキーは一度しか表示されません。必ずコピーして保存してください。
          </p>
          <code className="block break-all rounded bg-amber-100 px-2 py-1.5 font-mono text-xs text-amber-900">
            {state.apiKey}
          </code>
        </div>
      )}
    </div>
  )
}

// ---- Reissue Section ----

type ReissueApiKeySectionProps = {
  devices: Device[]
}

export function ReissueApiKeySection({ devices }: ReissueApiKeySectionProps) {
  if (devices.length === 0) {
    return <p className="text-sm text-gray-500">デバイスがありません</p>
  }

  return (
    <div className="divide-y divide-gray-100">
      {devices.map((device) => (
        <div key={device.id} className="py-3 first:pt-0 last:pb-0">
          <ReissueApiKeyForm device={device} />
        </div>
      ))}
    </div>
  )
}
