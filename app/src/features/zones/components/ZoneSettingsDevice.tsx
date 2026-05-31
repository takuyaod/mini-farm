'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Key, Pencil, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addDevice, type AddDeviceState } from '../api/addDevice'
import { reissueApiKey, type ReissueApiKeyState } from '../api/reissueApiKey'
import { updateDeviceName, type UpdateDeviceNameState } from '../api/updateDeviceName'
import type { Device } from '@/features/dashboard/types'

// ---- Add Device Form ----

type AddDeviceFormProps = {
  zoneId: string
}

const initialAddState: AddDeviceState = { success: false }

function AddDeviceForm({ zoneId }: AddDeviceFormProps) {
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
          variant="green"
          disabled={isPending}
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

// ---- Edit Device Name Form ----

type EditDeviceNameFormProps = {
  device: Device
  zoneId: string
  onCancel: () => void
}

const initialUpdateNameState: UpdateDeviceNameState = { success: false }

function EditDeviceNameForm({ device, zoneId, onCancel }: EditDeviceNameFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, formAction, isPending] = useActionState(updateDeviceName, initialUpdateNameState)

  useEffect(() => {
    if (state.success) {
      onCancel()
    }
  }, [state.success, onCancel])

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="device_id" value={device.id} />
      <input type="hidden" name="zone_id" value={zoneId} />
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          name="name"
          type="text"
          defaultValue={device.name ?? ''}
          placeholder="デバイス名（任意）"
          className="flex-1 focus:border-green-500 focus:ring-green-500"
          disabled={isPending}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
          aria-label="キャンセル"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {state.error && <p className="text-xs text-red-500">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="submit" variant="green" size="sm" disabled={isPending}>
          {isPending ? '保存中...' : '保存'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isPending}
        >
          キャンセル
        </Button>
      </div>
    </form>
  )
}

// ---- Device Row (name edit + API key reissue) ----

type DeviceRowProps = {
  device: Device
  zoneId: string
}

const initialReissueState: ReissueApiKeyState = { success: false }

function DeviceRow({ device, zoneId }: DeviceRowProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [state, formAction, isPending] = useActionState(reissueApiKey, initialReissueState)

  return (
    <div className="space-y-2">
      {isEditingName ? (
        <EditDeviceNameForm
          device={device}
          zoneId={zoneId}
          onCancel={() => setIsEditingName(false)}
        />
      ) : (
        <div className="flex items-center gap-3">
          <span className="flex-1 text-sm text-gray-700">
            {device.name ?? `デバイス (${device.id.slice(0, 8)}...)`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditingName(true)}
            aria-label="デバイス名を編集"
          >
            <Pencil className="h-3.5 w-3.5" />
            編集
          </Button>
          <form action={formAction}>
            <input type="hidden" name="device_id" value={device.id} />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={isPending}
            >
              <Key className="h-3.5 w-3.5" />
              {isPending ? '発行中...' : 'APIキー再発行'}
            </Button>
          </form>
        </div>
      )}
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

// ---- Device Management Section ----

type DeviceManagementSectionProps = {
  devices: Device[]
  zoneId: string
}

export function DeviceManagementSection({ devices, zoneId }: DeviceManagementSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-700">デバイスを追加</h3>
        <AddDeviceForm zoneId={zoneId} />
      </div>

      {devices.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-700">登録済みデバイス</h3>
          <div className="divide-y divide-gray-100">
            {devices.map((device) => (
              <div key={device.id} className="py-3 first:pt-0 last:pb-0">
                <DeviceRow device={device} zoneId={zoneId} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
