import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { OFFLINE_THRESHOLD_MIN } from '@/constants'
import { DAY_MS } from '../utils/date'
import type {
  Alert,
  Device,
  PlantThreshold,
  Reading,
  Sensor,
  SensorWithReadingDetail,
  ZonePlant,
  ZoneDetailData,
} from '../types'

export const getZoneDetail = cache(async function getZoneDetail(
  zoneId: string
): Promise<ZoneDetailData | null> {
  const supabase = await createClient()

  const { data: zone, error: zoneError } = await supabase
    .from('zones')
    .select('*')
    .eq('id', zoneId)
    .single()

  if (zoneError || !zone) return null

  const [devicesRes, zonePlantRes] = await Promise.all([
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
  ])

  const devices: Device[] = devicesRes.data ?? []
  const currentPlant: ZonePlant | null = zonePlantRes.data ?? null

  const allActiveSensorIds = devices
    .flatMap((d: Device) => d.sensors)
    .filter((s: Sensor) => s.is_active)
    .map((s: Sensor) => s.id)

  const [alertsRes, readingsRes, thresholdsRes] = await Promise.all([
    allActiveSensorIds.length > 0
      ? supabase
          .from('alerts')
          .select('*')
          .is('resolved_at', null)
          .in('sensor_id', allActiveSensorIds)
      : { data: [] },
    allActiveSensorIds.length > 0
      ? supabase
          .from('readings')
          .select('*')
          .in('sensor_id', allActiveSensorIds)
          .gte(
            'recorded_at',
            new Date(Date.now() - DAY_MS).toISOString()
          )
          .order('recorded_at', { ascending: false })
      : { data: [] },
    currentPlant
      ? supabase
          .from('plant_thresholds')
          .select('*')
          .eq('plant_id', currentPlant.plant_id)
      : { data: [] },
  ])

  const allAlerts: Alert[] = alertsRes.data ?? []
  const allReadings: Reading[] = readingsRes.data ?? []
  const allThresholds: PlantThreshold[] = thresholdsRes.data ?? []

  const latestReadingBySensorId = new Map<string, Reading>()
  for (const r of allReadings) {
    if (!latestReadingBySensorId.has(r.sensor_id)) {
      latestReadingBySensorId.set(r.sensor_id, r)
    }
  }

  const alertBySensorId = new Map<string, Alert>()
  for (const a of allAlerts) {
    alertBySensorId.set(a.sensor_id, a)
  }

  const thresholdBySensorType = new Map<string, PlantThreshold>()
  for (const t of allThresholds) {
    thresholdBySensorType.set(t.sensor_type_id, t)
  }

  const allActiveSensors: Sensor[] = devices.flatMap((d: Device) =>
    d.sensors.filter((s: Sensor) => s.is_active)
  )

  const sensorsWithReadings: SensorWithReadingDetail[] = allActiveSensors.map((sensor) => ({
    ...sensor,
    latestReading: latestReadingBySensorId.get(sensor.id) ?? null,
    threshold: thresholdBySensorType.get(sensor.sensor_type_id) ?? null,
    hasAlert: alertBySensorId.has(sensor.id),
    alert: alertBySensorId.get(sensor.id) ?? null,
  }))

  sensorsWithReadings.sort((a, b) => {
    if (a.hasAlert && !b.hasAlert) return -1
    if (!a.hasAlert && b.hasAlert) return 1
    return 0
  })

  const deviceLastSeens = devices
    .map((d: Device) => d.last_seen_at)
    .filter((t): t is string => t !== null)

  const latestLastSeen =
    deviceLastSeens.length > 0
      ? deviceLastSeens.reduce((a, b) => (a > b ? a : b))
      : null

  const offlineThresholdMs = OFFLINE_THRESHOLD_MIN * 60 * 1000
  const isOffline = latestLastSeen
    ? Date.now() - new Date(latestLastSeen).getTime() > offlineThresholdMs
    : devices.length > 0

  return {
    zone,
    devices,
    sensorsWithReadings,
    unresolvedAlerts: allAlerts,
    currentPlant,
    isOffline,
    lastSeenAt: latestLastSeen,
  }
})
