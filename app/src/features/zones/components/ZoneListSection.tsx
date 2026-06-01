'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ZoneListRow } from './ZoneListRow'
import { AddZoneModal } from '@/features/dashboard/components/AddZoneModal'
import type { ZoneListItem } from '../types'

type Props = {
  activeZones: ZoneListItem[]
}

export function ZoneListSection({ activeZones }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div>
      {/* アクティブゾーン一覧 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-content-primary">
            アクティブ
            <span className="ml-1.5 text-xs font-normal text-content-muted">
              ({activeZones.length})
            </span>
          </h2>
          <Button variant="green" size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
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
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-surface-border bg-white py-12 text-center">
            <p className="text-sm text-content-muted">ゾーンがありません</p>
            <Button variant="green" size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              ゾーンを追加
            </Button>
          </div>
        )}
      </section>

      {/* 非アクティブゾーン一覧（将来実装） */}
      {/* TODO: 非アクティブ化機能実装後にここに追加 */}

      <AddZoneModal open={modalOpen} onOpenChange={setModalOpen} />
    </div>
  )
}
