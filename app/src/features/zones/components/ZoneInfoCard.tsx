'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Scissors } from 'lucide-react'
import { HarvestModal } from './HarvestModal'
import { getDaysFromPlanting } from '../utils'
import type { Alert, Zone, ZonePlant } from '../types'

type Props = {
  zone: Zone
  currentPlant: ZonePlant | null
  unresolvedAlerts: Alert[]
}

export function ZoneInfoCard({ zone, currentPlant, unresolvedAlerts }: Props) {
  const [harvestOpen, setHarvestOpen] = useState(false)
  const alertCount = unresolvedAlerts.length

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            {currentPlant ? (
              <>
                <span className="text-lg font-semibold text-gray-900">
                  {currentPlant.plants.name}
                </span>
                <span className="text-sm text-gray-500">
                  植付から {getDaysFromPlanting(currentPlant.planted_at)} 日
                </span>
              </>
            ) : (
              <span className="text-lg font-semibold text-gray-400">作付けなし</span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                zone.type === 'hydroponic'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {zone.type === 'hydroponic' ? '水耕' : '土壌'}
            </span>
            {alertCount > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                ⚠ {alertCount}件
              </span>
            )}
          </div>
        </div>

        {currentPlant ? (
          <button
            onClick={() => setHarvestOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
          >
            <Scissors className="h-4 w-4" />
            収穫する
          </button>
        ) : (
          <Link
            href={`/zones/${zone.id}/settings`}
            className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            新しい作付けを開始する
          </Link>
        )}
      </div>

      {currentPlant && (
        <HarvestModal
          open={harvestOpen}
          onClose={() => setHarvestOpen(false)}
          zonePlant={currentPlant}
          zoneId={zone.id}
        />
      )}
    </div>
  )
}
