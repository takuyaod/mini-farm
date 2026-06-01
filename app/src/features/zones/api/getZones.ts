import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Zone } from '@/features/dashboard/types'
import type { ZoneListItem } from '../types'

type ZonePlantRow = {
  zone_id: string
  plants: { name: string } | null
}

export async function getZones(): Promise<ZoneListItem[]> {
  const supabase = await createClient()

  const { data: zones, error: zonesError } = await supabase
    .from('zones')
    .select('*')
    .order('created_at', { ascending: true })

  if (zonesError || !zones || zones.length === 0) {
    return []
  }

  const zoneIds = zones.map((z: Zone) => z.id)

  const [devicesRes, zonePlantsRes] = await Promise.all([
    supabase.from('devices').select('id, zone_id').in('zone_id', zoneIds),
    supabase
      .from('zone_plants')
      .select('zone_id, plants(name)')
      .in('zone_id', zoneIds)
      .is('harvested_at', null),
  ])

  const devices = devicesRes.data ?? []
  const zonePlants = (zonePlantsRes.data ?? []) as unknown as ZonePlantRow[]

  return zones.map((zone: Zone) => {
    const deviceCount = devices.filter((d) => d.zone_id === zone.id).length
    const zonePlant = zonePlants.find((zp) => zp.zone_id === zone.id) ?? null
    const currentPlantName = zonePlant?.plants?.name ?? null

    return {
      zone,
      deviceCount,
      currentPlantName,
    }
  })
}
