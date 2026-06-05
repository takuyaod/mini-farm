import type {
  Alert,
  Device,
  Plant,
  PlantThreshold,
  Sensor,
  SensorWithReading,
  Zone,
  ZonePlant,
} from '@/features/dashboard/types'

export type { Alert, Device, Plant, PlantThreshold, Sensor, SensorWithReading, Zone, ZonePlant }

export type ZoneListItem = {
  zone: Zone
  deviceCount: number
  currentPlantName: string | null
}

export type SensorWithAlert = SensorWithReading & {
  alertBreachDirection: 'high' | 'low' | null
}

export type ZoneDetailData = {
  zone: Zone
  devices: Device[]
  sensors: SensorWithAlert[]
  unresolvedAlerts: Alert[]
  currentPlant: ZonePlant | null
  pastPlants: ZonePlant[]
  isOffline: boolean
  latestLastSeen: string | null
}

export type ChartPeriod = '24h' | '7d' | '30d'

export type ChartDataPoint = {
  recorded_at: string
  value: number
}
