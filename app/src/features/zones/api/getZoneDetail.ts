import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { OFFLINE_THRESHOLD_MIN } from '@/constants'
import type { SensorWithAlert, ZoneDetailData } from '../types'
import type { Alert, Device, PlantThreshold, Reading, Sensor, Zone, ZonePlant } from '@/features/dashboard/types'

export async function getZoneDetail(zoneId: string): Promise<ZoneDetailData | null> {
  const supabase = await createClient()

  const { data: zone, error: zoneError } = await supabase
    .from('zones')
    .select('*')
    .eq('id', zoneId)
    .single()

  if (zoneError || !zone) return null

  const [devicesRes, zonePlantRes, pastPlantsRes] = await Promise.all([
    supabase
      .from('devices')
      .select('*, sensors(*, sensor_type_masters(*))')
      .eq('zone_id', zoneId),
    supabase
      .from('zone_plants')
      .select('*, plants(*)')
      .eq('zone_id', zoneId)
      .is('harvested_at', null)
      .maybeSingle(),
    supabase
      .from('zone_plants')
      .select('*, plants(*)')
      .eq('zone_id', zoneId)
      .not('harvested_at', 'is', null)
      .order('planted_at', { ascending: false }),
  ])

  const devices: Device[] = devicesRes.data ?? []
  const currentPlant = zonePlantRes.data ?? null
  const pastPlants: ZonePlant[] = (pastPlantsRes.data ?? []) as ZonePlant[]

  const allActiveSensors: Sensor[] = devices.flatMap((d: Device) =>
    d.sensors.filter((s: Sensor) => s.is_active)
  )
  const allSensorIds = allActiveSensors.map((s) => s.id)

  const [alertsData, readingsData, thresholdsData] = await Promise.all([
    allSensorIds.length > 0
      ? supabase.from('alerts').select('*').is('resolved_at', null).in('sensor_id', allSensorIds)
      : { data: [] as Alert[] },
    allSensorIds.length > 0
      ? supabase
          .from('readings')
          .select('*')
          .in('sensor_id', allSensorIds)
          .gte('recorded_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('recorded_at', { ascending: false })
      : { data: [] as Reading[] },
    currentPlant
      ? supabase.from('plant_thresholds').select('*').eq('plant_id', currentPlant.plant_id)
      : { data: [] as PlantThreshold[] },
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

  const thresholdBySensorType = new Map<string, PlantThreshold>()
  for (const t of allThresholds) {
    thresholdBySensorType.set(t.sensor_type_id, t)
  }

  const alertBySensorId = new Map<string, Alert>()
  for (const a of allAlerts) {
    if (!alertBySensorId.has(a.sensor_id)) {
      alertBySensorId.set(a.sensor_id, a)
    }
  }

  const sensors: SensorWithAlert[] = allActiveSensors.map((sensor) => {
    const alert = alertBySensorId.get(sensor.id) ?? null
    return {
      ...sensor,
      latestReading: latestReadingBySensorId.get(sensor.id) ?? null,
      threshold: thresholdBySensorType.get(sensor.sensor_type_id) ?? null,
      hasAlert: alert !== null,
      alertBreachDirection: alert?.breach_direction ?? null,
    }
  })

  sensors.sort((a, b) => {
    if (a.hasAlert && !b.hasAlert) return -1
    if (!a.hasAlert && b.hasAlert) return 1
    return 0
  })

  const offlineThresholdMs = OFFLINE_THRESHOLD_MIN * 60 * 1000
  const now = Date.now()
  const deviceLastSeens = devices
    .map((d: Device) => d.last_seen_at)
    .filter((t): t is string => t !== null)
  const latestLastSeen =
    deviceLastSeens.length > 0 ? deviceLastSeens.reduce((a, b) => (a > b ? a : b)) : null
  const isOffline = latestLastSeen
    ? now - new Date(latestLastSeen).getTime() > offlineThresholdMs
    : devices.length > 0

  return {
    zone: zone as Zone,
    devices,
    sensors,
    unresolvedAlerts: allAlerts,
    currentPlant,
    pastPlants,
    isOffline,
    latestLastSeen,
  }
}
