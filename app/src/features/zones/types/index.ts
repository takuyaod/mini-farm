export type SensorTypeMaster = {
  id: string
  label: string
  unit: string | null
  cultivation_type: 'hydroponic' | 'soil' | 'both'
}

export type Sensor = {
  id: string
  device_id: string
  sensor_type_id: string
  label: string | null
  is_active: boolean
  sensor_type_masters: SensorTypeMaster
}

export type Reading = {
  id: string
  sensor_id: string
  value: number
  recorded_at: string
}

export type PlantThreshold = {
  id: string
  plant_id: string
  sensor_type_id: string
  optimal_min: number | null
  optimal_max: number | null
  alert_min: number | null
  alert_max: number | null
}

export type Plant = {
  id: string
  name: string
  cultivation_type: 'hydroponic' | 'soil' | 'both'
}

export type ZonePlant = {
  id: string
  zone_id: string
  plant_id: string
  planted_at: string
  harvested_at: string | null
  notes: string | null
  harvest_weight_g: number | null
  plants: Plant
}

export type Alert = {
  id: string
  sensor_id: string
  alert_type: 'threshold_breach' | 'sensor_fault'
  triggered_value: number | null
  breach_direction: 'high' | 'low' | null
  started_at: string
  resolved_at: string | null
}

export type Device = {
  id: string
  zone_id: string
  name: string | null
  last_seen_at: string | null
  sensors: Sensor[]
}

export type Zone = {
  id: string
  user_id: string
  name: string
  type: 'hydroponic' | 'soil'
  created_at: string
}

export type SensorWithReadingDetail = Sensor & {
  latestReading: Reading | null
  threshold: PlantThreshold | null
  hasAlert: boolean
  alert: Alert | null
}

export type ZoneDetailData = {
  zone: Zone
  devices: Device[]
  sensorsWithReadings: SensorWithReadingDetail[]
  unresolvedAlerts: Alert[]
  currentPlant: ZonePlant | null
  isOffline: boolean
  lastSeenAt: string | null
}

export type ChartPeriod = '24h' | '7d' | '30d'

export type ChartDataPoint = {
  recorded_at: string
  value: number
}
