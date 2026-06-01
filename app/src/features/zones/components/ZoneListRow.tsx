import Link from 'next/link'
import { ChevronRight, Cpu, Droplets, Leaf } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ZoneListItem } from '../types'

type Props = {
  item: ZoneListItem
}

export function ZoneListRow({ item }: Props) {
  const { zone, deviceCount, currentPlantName } = item

  return (
    <Link
      href={`/zones/${zone.id}`}
      className="flex items-center gap-4 rounded-xl bg-white px-5 py-4 ring-1 ring-surface-border transition-shadow hover:shadow-md"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-content-primary">{zone.name}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-content-secondary">
          <Badge variant={zone.type === 'hydroponic' ? 'blue' : 'green'} className="shrink-0 gap-1">
            {zone.type === 'hydroponic' ? (
              <>
                <Droplets className="h-3 w-3" />
                水耕
              </>
            ) : (
              <>
                <Leaf className="h-3 w-3" />
                土耕
              </>
            )}
          </Badge>
          <span className="flex shrink-0 items-center gap-0.5 text-content-secondary">
            <Cpu className="h-3 w-3 text-content-muted" />
            {deviceCount}台
          </span>
          {currentPlantName && (
            <span className="text-content-secondary">・{currentPlantName}</span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-content-muted" />
    </Link>
  )
}
