'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
            <Badge variant={zone.type === 'hydroponic' ? 'blue' : 'green'}>
              {zone.type === 'hydroponic' ? '水耕' : '土壌'}
            </Badge>
            {alertCount > 0 && (
              <Badge variant="destructive">
                ⚠ {alertCount}件
              </Badge>
            )}
          </div>
        </div>

        {currentPlant ? (
          <Button
            onClick={() => setHarvestOpen(true)}
            variant="green"
            className="shrink-0"
          >
            <Scissors className="h-4 w-4" />
            収穫する
          </Button>
        ) : (
          <Button variant="outline" asChild className="shrink-0">
            <Link href={`/zones/${zone.id}/settings`}>
              新しい作付けを開始する
            </Link>
          </Button>
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
