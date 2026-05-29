'use server'

import { createClient } from '@/lib/supabase/server'
import type { AlertWithContext, AlertsResult, GetAlertsParams } from '../types'

const PAGE_SIZE = 20

type RawAlert = {
  id: string
  sensor_id: string
  alert_type: 'threshold_breach' | 'sensor_fault'
  triggered_value: number | null
  breach_direction: string | null
  started_at: string
  resolved_at: string | null
  sensors: {
    id: string
    label: string | null
    sensor_type_id: string
    sensor_type_masters: { id: string; label: string; unit: string | null }
    devices: { zone_id: string; zones: { id: string; name: string } }
  }
}

export async function getAlerts({ tab, zoneId, cursor }: GetAlertsParams): Promise<AlertsResult> {
  const supabase = await createClient()

  let sensorIdFilter: string[] | null = null
  if (zoneId) {
    const { data: devices } = await supabase
      .from('devices')
      .select('id')
      .eq('zone_id', zoneId)
    const deviceIds = (devices ?? []).map((d: { id: string }) => d.id)
    if (deviceIds.length === 0) return { alerts: [], totalCount: 0 }
    const { data: sensors } = await supabase
      .from('sensors')
      .select('id')
      .in('device_id', deviceIds)
      .eq('is_active', true)
    sensorIdFilter = (sensors ?? []).map((s: { id: string }) => s.id)
    if (sensorIdFilter.length === 0) return { alerts: [], totalCount: 0 }
  }

  const buildBase = () => {
    let q = supabase.from('alerts').select('id', { count: 'exact', head: true })
    q = tab === 'unresolved' ? q.is('resolved_at', null) : q.not('resolved_at', 'is', null)
    if (sensorIdFilter) q = q.in('sensor_id', sensorIdFilter)
    return q
  }

  let alertsQuery = supabase
    .from('alerts')
    .select(
      `*, sensors (id, label, sensor_type_id, sensor_type_masters (id, label, unit), devices (zone_id, zones (id, name)))`
    )
  alertsQuery =
    tab === 'unresolved'
      ? alertsQuery.is('resolved_at', null)
      : alertsQuery.not('resolved_at', 'is', null)
  if (sensorIdFilter) alertsQuery = alertsQuery.in('sensor_id', sensorIdFilter)
  if (cursor) alertsQuery = alertsQuery.lt('started_at', cursor)
  alertsQuery = alertsQuery.order('started_at', { ascending: false }).limit(PAGE_SIZE)

  const [alertsResult, countResult] = await Promise.all([alertsQuery, buildBase()])

  const rawAlerts = (alertsResult.data ?? []) as RawAlert[]
  const totalCount = countResult.count ?? 0

  const zoneIds = [...new Set(rawAlerts.map((a) => a.sensors?.devices?.zones?.id).filter(Boolean))]

  const { data: zonePlants } =
    zoneIds.length > 0
      ? await supabase
          .from('zone_plants')
          .select('zone_id, plant_id, plants (id, name)')
          .in('zone_id', zoneIds)
          .is('harvested_at', null)
      : { data: [] }

  const plantIds = [...new Set((zonePlants ?? []).map((zp: { plant_id: string }) => zp.plant_id))]
  const { data: thresholds } =
    plantIds.length > 0
      ? await supabase
          .from('plant_thresholds')
          .select('plant_id, sensor_type_id, alert_min, alert_max')
          .in('plant_id', plantIds)
      : { data: [] }

  const plantNameByZoneId = new Map<string, string>()
  const plantIdByZoneId = new Map<string, string>()
  for (const zp of (zonePlants ?? []) as unknown as {
    zone_id: string
    plant_id: string
    plants: { name: string }
  }[]) {
    plantNameByZoneId.set(zp.zone_id, zp.plants.name)
    plantIdByZoneId.set(zp.zone_id, zp.plant_id)
  }

  const thresholdMap = new Map<
    string,
    { alert_min: number | null; alert_max: number | null }
  >()
  for (const t of (thresholds ?? []) as {
    plant_id: string
    sensor_type_id: string
    alert_min: number | null
    alert_max: number | null
  }[]) {
    thresholdMap.set(`${t.plant_id}:${t.sensor_type_id}`, t)
  }

  const alerts: AlertWithContext[] = rawAlerts.map((alert) => {
    const sensor = alert.sensors ?? ({} as RawAlert['sensors'])
    const zone = sensor.devices?.zones ?? { id: '', name: '' }
    const sensorLabel = sensor.label ?? sensor.sensor_type_masters?.label ?? ''
    const zId = zone.id
    const plantId = plantIdByZoneId.get(zId)
    const threshold = plantId ? thresholdMap.get(`${plantId}:${sensor.sensor_type_id}`) : null
    const alertThresholdValue =
      alert.breach_direction === 'high'
        ? (threshold?.alert_max ?? null)
        : alert.breach_direction === 'low'
          ? (threshold?.alert_min ?? null)
          : null

    return {
      id: alert.id,
      sensor_id: alert.sensor_id,
      alert_type: alert.alert_type,
      triggered_value: alert.triggered_value,
      breach_direction: alert.breach_direction as 'high' | 'low' | null,
      started_at: alert.started_at,
      resolved_at: alert.resolved_at,
      sensorLabel,
      sensorTypeId: sensor.sensor_type_id ?? '',
      unit: sensor.sensor_type_masters?.unit ?? null,
      zoneId: zId,
      zoneName: zone.name,
      plantName: plantNameByZoneId.get(zId) ?? null,
      alertThresholdValue,
    }
  })

  return { alerts, totalCount }
}
