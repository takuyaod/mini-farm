'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Check, Pencil, ShieldOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { approveDevice, type ApproveDeviceState } from '../api/approveDevice'
import { revokeDevice, type RevokeDeviceState } from '../api/revokeDevice'
import { updateDeviceName, type UpdateDeviceNameState } from '../api/updateDeviceName'
import { formatDateTime } from '../utils'
import type { Device, PendingDevice } from '../types'

// ---- Pending Device Card (approve) ----

type PendingDeviceCardProps = {
  device: PendingDevice
  zoneId: string
}

const initialApproveState: ApproveDeviceState = { success: false }

function PendingDeviceCard({ device, zoneId }: PendingDeviceCardProps) {
  const [name, setName] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [state, formAction, isPending] = useActionState(approveDevice, initialApproveState)

  return (
    <div className="rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-mono text-sm text-gray-800">{device.mac_address}</span>
        <span className="text-xs text-gray-500">
          初回接続: {formatDateTime(device.created_at)}
        </span>
        {device.firmware_ver && (
          <span className="text-xs text-gray-500">fw: {device.firmware_ver}</span>
        )}
      </div>

      {!confirming ? (
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="デバイス名（任意）"
            className="flex-1 focus:border-green-500 focus:ring-green-500"
            disabled={isPending}
          />
          <Button
            type="button"
            variant="green"
            size="sm"
            onClick={() => setConfirming(true)}
            disabled={isPending}
          >
            <Check className="h-3.5 w-3.5" />
            このゾーンに承認
          </Button>
        </div>
      ) : (
        <div className="space-y-2 rounded-md border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-800">
            このデバイスをこのゾーンに承認しますか？
          </p>
          {state.error && <p className="text-xs text-red-500">{state.error}</p>}
          <form action={formAction} className="flex gap-2">
            <input type="hidden" name="device_id" value={device.id} />
            <input type="hidden" name="zone_id" value={zoneId} />
            <input type="hidden" name="name" value={name} />
            <Button type="submit" variant="green" size="sm" disabled={isPending}>
              {isPending ? '承認中...' : '承認する'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirming(false)}
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

// ---- Revoke Device Button (destructive, with confirmation) ----

type RevokeDeviceButtonProps = {
  device: Device
  zoneId: string
}

const initialRevokeState: RevokeDeviceState = { success: false }

function RevokeDeviceButton({ device, zoneId }: RevokeDeviceButtonProps) {
  const [confirming, setConfirming] = useState(false)
  const [state, formAction, isPending] = useActionState(revokeDevice, initialRevokeState)

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setConfirming(true)}
        className="border-red-200 text-red-600 hover:bg-red-50"
      >
        <ShieldOff className="h-3.5 w-3.5" />
        無効化する
      </Button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-600">本当に無効化しますか？</span>
        <form action={formAction}>
          <input type="hidden" name="device_id" value={device.id} />
          <input type="hidden" name="zone_id" value={zoneId} />
          <Button
            type="submit"
            size="sm"
            disabled={isPending}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isPending ? '処理中...' : '無効化する'}
          </Button>
        </form>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={isPending}
        >
          キャンセル
        </Button>
      </div>
      {state.error && <p className="text-xs text-red-500">{state.error}</p>}
    </div>
  )
}

// ---- Status Badge ----

function StatusBadge({ status }: { status: Device['status'] }) {
  if (status === 'active') {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        稼働中
      </span>
    )
  }
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      無効化済み
    </span>
  )
}

// ---- Device Row (registered device: name edit + revoke) ----

type DeviceRowProps = {
  device: Device
  zoneId: string
}

function DeviceRow({ device, zoneId }: DeviceRowProps) {
  const [isEditingName, setIsEditingName] = useState(false)

  if (isEditingName) {
    return (
      <EditDeviceNameForm
        device={device}
        zoneId={zoneId}
        onCancel={() => setIsEditingName(false)}
      />
    )
  }

  const displayName = device.name ?? device.mac_address.replace(/:/g, '').slice(-6)

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-800">{displayName}</span>
          <StatusBadge status={device.status} />
        </div>
        <span className="font-mono text-xs text-gray-500">{device.mac_address}</span>
      </div>
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
      {device.status === 'active' && <RevokeDeviceButton device={device} zoneId={zoneId} />}
    </div>
  )
}

// ---- Device Management Section ----

type DeviceManagementSectionProps = {
  pendingDevices: PendingDevice[]
  devices: Device[]
  zoneId: string
}

export function DeviceManagementSection({
  pendingDevices,
  devices,
  zoneId,
}: DeviceManagementSectionProps) {
  const hasNothing = pendingDevices.length === 0 && devices.length === 0

  return (
    <div className="space-y-6">
      {pendingDevices.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-700">
            未承認デバイス（{pendingDevices.length}）
          </h3>
          <div className="space-y-3">
            {pendingDevices.map((device) => (
              <PendingDeviceCard key={device.id} device={device} zoneId={zoneId} />
            ))}
          </div>
        </div>
      )}

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

      {hasNothing && (
        <p className="text-sm text-gray-500">
          登録済み・未承認のデバイスはありません。ESP32を起動すると自動的に未承認デバイスとして表示されます。
        </p>
      )}
    </div>
  )
}
