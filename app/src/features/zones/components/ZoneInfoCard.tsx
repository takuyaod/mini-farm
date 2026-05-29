'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Leaf, Scissors, AlertTriangle } from 'lucide-react'
import { HarvestModal } from './HarvestModal'
import type { Zone, ZonePlant, Alert } from '../types'

type Props = {
  zone: Zone
  currentPlant: ZonePlant | null
  unresolvedAlerts: Alert[]
}

function daysSince(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function ZoneInfoCard({ zone, currentPlant, unresolvedAlerts }: Props) {
  const [isHarvestOpen, setIsHarvestOpen] = useState(false)

  const plantName = currentPlant?.plants.name ?? '作付けなし'
  const daysPlanted = currentPlant ? daysSince(currentPlant.planted_at) : null
  const alertCount = unresolvedAlerts.length

  return (
    <>
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Leaf className="h-4 w-4 text-green-600 shrink-0" />
                <span className="font-semibold text-gray-900">{plantName}</span>
              </div>
              {daysPlanted !== null && (
                <span className="text-sm text-gray-500">植付から {daysPlanted} 日</span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
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
                <span className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                  <AlertTriangle className="h-3 w-3" />
                  {alertCount}件のアラート
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0">
            {currentPlant ? (
              <button
                type="button"
                onClick={() => setIsHarvestOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                <Scissors className="h-4 w-4" />
                収穫する
              </button>
            ) : (
              <Link
                href={`/zones/${zone.id}/settings`}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                新しい作付けを開始する
              </Link>
            )}
          </div>
        </div>
      </div>
      {currentPlant && (
        <HarvestModal
          isOpen={isHarvestOpen}
          onClose={() => setIsHarvestOpen(false)}
          zonePlant={currentPlant}
          zoneId={zone.id}
        />
      )}
    </>
  )
}
