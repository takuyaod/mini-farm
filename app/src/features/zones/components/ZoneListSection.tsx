'use client'

import { useState, useActionState } from 'react'
import { Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ZoneListRow } from './ZoneListRow'
import { AddZoneModal } from '@/components/AddZoneModal'
import { activateZone, type ActivateZoneState } from '../api/activateZone'
import type { ZoneListItem } from '../types'

type Props = {
  activeZones: ZoneListItem[]
  inactiveZones: ZoneListItem[]
}

const initialActivateState: ActivateZoneState = { success: false }

function InactiveZoneRow({ item }: { item: ZoneListItem }) {
  const [state, formAction, isPending] = useActionState(activateZone, initialActivateState)

  return (
    <div className="flex items-center gap-4 rounded-xl bg-white px-5 py-4 ring-1 ring-surface-border opacity-60">
      <div className="min-w-0 flex-1">
        <span className="truncate font-semibold text-content-primary">{item.zone.name}</span>
        {item.currentPlantName && (
          <p className="mt-0.5 text-xs text-content-muted">{item.currentPlantName}</p>
        )}
      </div>
      <form action={formAction}>
        <input type="hidden" name="zone_id" value={item.zone.id} />
        <Button
          type="submit"
          variant="outline"
          size="sm"
          disabled={isPending}
          className="shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          {isPending ? '処理中...' : '再開する'}
        </Button>
      </form>
      {state.error && (
        <p className="text-xs text-red-500">{state.error}</p>
      )}
    </div>
  )
}

export function ZoneListSection({ activeZones, inactiveZones }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="space-y-8">
      {/* アクティブゾーン一覧 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-content-primary">
            アクティブ
            <span className="ml-1.5 text-xs font-normal text-content-muted">
              ({activeZones.length})
            </span>
          </h2>
          <Button variant="green" size="default" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            ゾーンを追加
          </Button>
        </div>

        {activeZones.length > 0 ? (
          <div className="flex flex-col gap-3">
            {activeZones.map((item) => (
              <ZoneListRow key={item.zone.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-border bg-white py-12 text-center">
            <p className="text-sm text-content-muted">ゾーンがありません</p>
          </div>
        )}
      </section>

      {/* 非アクティブゾーン一覧 */}
      {inactiveZones.length > 0 && (
        <section>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-content-primary">
              休止中
              <span className="ml-1.5 text-xs font-normal text-content-muted">
                ({inactiveZones.length})
              </span>
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {inactiveZones.map((item) => (
              <InactiveZoneRow key={item.zone.id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* key={modalOpen} でオープンするたびに再マウントし、useActionState の state をリセットする */}
      <AddZoneModal key={String(modalOpen)} open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}
