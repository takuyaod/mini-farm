import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { OFFLINE_THRESHOLD_MIN } from '@/constants'
import type {
  Alert,
  Device,
  DashboardData,
  PlantThreshold,
  Reading,
  Sensor,
  SensorWithReading,
  Zone,
  ZoneCardData,
  ZonePlant,
} from '../types'

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient()

  const { data: zones, error: zonesError } = await supabase
    .from('zones')
    .select('*')
    .order('created_at', { ascending: true })

  if (zonesError || !zones || zones.length === 0) {
    return { zones: [], totalUnresolvedAlerts: 0 }
  }

  const zoneIds = zones.map((z: Zone) => z.id)

  const [devicesRes, zonePlantsRes] = await Promise.all([
    supabase
      .from('devices')
      .select('*, sensors(*, sensor_type_masters(*))')
      .in('zone_id', zoneIds),
    supabase
      .from('zone_plants')
      .select('*, plants(*)')
      .in('zone_id', zoneIds)
      .is('harvested_at', null),
  ])

  const devices: Device[] = devicesRes.data ?? []
  const zonePlants: ZonePlant[] = zonePlantsRes.data ?? []

  const allSensorIds = devices.flatMap((d: Device) => d.sensors.map((s: Sensor) => s.id))

  const [alertsData, readingsData, thresholdsData] = await Promise.all([
    allSensorIds.length > 0
      ? supabase.from('alerts').select('*').is('resolved_at', null).in('sensor_id', allSensorIds)
      : { data: [] },
    allSensorIds.length > 0
      ? supabase
          .from('readings')
          .select('*')
          .in('sensor_id', allSensorIds)
          .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('recorded_at', { ascending: false })
      : { data: [] },
    (() => {
      const plantIds = zonePlants.map((zp) => zp.plant_id)
      return plantIds.length > 0
        ? supabase.from('plant_thresholds').select('*').in('plant_id', plantIds)
        : { data: [] }
    })(),
  ])

  const allAlerts: Alert[] = alertsData.data ?? []
  const allReadings: Reading[] = readingsData.data ?? []
  const allThresholds: PlantThreshold[] = thresholdsData.data ?? []

  const latestReadingBySensorId = new Map<string, Reading>()
  for (const r of allReadings) {
    if (!latestReadingBySensorId.has(r.sensor_id)) {
      latestReadingBySensorId.set(r.sensor_id, r)
    }
  }

  const alertSensorIds = new Set(allAlerts.map((a: Alert) => a.sensor_id))
  const offlineThresholdMs = OFFLINE_THRESHOLD_MIN * 60 * 1000
  const now = Date.now()

  const zoneCards: ZoneCardData[] = zones.map((zone: Zone) => {
    const zoneDevices = devices.filter((d: Device) => d.zone_id === zone.id)
    const zonePlant = zonePlants.find((zp) => zp.zone_id === zone.id) ?? null

    const thresholdBySensorType = new Map<string, PlantThreshold>()
    if (zonePlant) {
      for (const t of allThresholds.filter((t) => t.plant_id === zonePlant.plant_id)) {
        thresholdBySensorType.set(t.sensor_type_id, t)
      }
    }

    const allZoneSensors: Sensor[] = zoneDevices.flatMap((d: Device) => d.sensors)

    const sensorsWithReadings: SensorWithReading[] = allZoneSensors.map((sensor) => ({
      ...sensor,
      latestReading: latestReadingBySensorId.get(sensor.id) ?? null,
      threshold: thresholdBySensorType.get(sensor.sensor_type_id) ?? null,
      hasAlert: alertSensorIds.has(sensor.id),
    }))

    sensorsWithReadings.sort((a, b) => {
      if (a.hasAlert && !b.hasAlert) return -1
      if (!a.hasAlert && b.hasAlert) return 1
      return 0
    })

    const unresolvedAlerts = allAlerts.filter((a) =>
      allZoneSensors.some((s) => s.id === a.sensor_id)
    )

    const deviceLastSeens = zoneDevices
      .map((d: Device) => d.last_seen_at)
      .filter((t): t is string => t !== null)

    const latestLastSeen =
      deviceLastSeens.length > 0
        ? deviceLastSeens.reduce((a, b) => (a > b ? a : b))
        : null

    const isOffline = latestLastSeen
      ? now - new Date(latestLastSeen).getTime() > offlineThresholdMs
      : zoneDevices.length > 0

    return {
      zone,
      devices: zoneDevices,
      sensorsWithReadings,
      unresolvedAlerts,
      currentPlant: zonePlant as ZoneCardData['currentPlant'],
      isOffline,
      lastSeenAt: latestLastSeen,
    }
  })

  return { zones: zoneCards, totalUnresolvedAlerts: allAlerts.length }
}
