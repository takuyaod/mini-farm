'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, Droplets, Leaf, Scissors, Sprout } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { HarvestModal } from './HarvestModal'
import { getDaysFromPlanting, formatPlantingDate } from '../utils'
import type { Alert, Zone, ZonePlant } from '../types'

type Props = {
  zone: Zone
  currentPlant: ZonePlant | null
  unresolvedAlerts: Alert[]
}

export function ZoneInfoCard({ zone, currentPlant, unresolvedAlerts }: Props) {
  const [harvestOpen, setHarvestOpen] = useState(false)
  const alertCount = unresolvedAlerts.length
  const MethodIcon = zone.type === 'hydroponic' ? Droplets : Leaf

  return (
    <div className="rounded-xl bg-white px-6 py-5 ring-1 ring-[#e6e9e5] shadow-sm">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          {/* Sprout icon */}
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#ecf5ee] to-[#d6ead9] text-[#246e3a]">
            <Sprout size={28} strokeWidth={2} />
          </div>

          <div>
            {currentPlant ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[22px] font-semibold tracking-tight text-[#0f1a14]">
                    {currentPlant.plants.name}
                  </h2>
                  <span className="text-[14px] text-[#8a978f]">·</span>
                  <span className="text-[15px] font-medium tabular-nums text-[#246e3a]">
                    {getDaysFromPlanting(currentPlant.planted_at)} 日目
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge variant={zone.type === 'hydroponic' ? 'blue' : 'green'} className="gap-1">
                    <MethodIcon className="h-2.5 w-2.5" />
                    {zone.type === 'hydroponic' ? '水耕栽培' : '土壌栽培'}
                  </Badge>
                  {alertCount > 0 && (
                    <Badge variant="destructive">
                      {alertCount} 件のアラート
                    </Badge>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11.5px] text-[#8a978f]">
                    <Calendar className="h-3 w-3" />
                    植付 {formatPlantingDate(currentPlant.planted_at)}
                  </span>
                </div>
              </>
            ) : (
              <span className="text-lg font-semibold text-content-muted">作付けなし</span>
            )}
          </div>
        </div>

        {/* Right: harvest button */}
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
