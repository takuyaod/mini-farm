import type {
  Alert,
  Device,
  Plant,
  PlantThreshold,
  Reading,
  Sensor,
  Zone,
  ZonePlant,
} from '@/types'

export type { Alert, Device, Plant, PlantThreshold, Reading, Sensor, Zone, ZonePlant }

export type ZoneListItem = {
  zone: Zone
  deviceCount: number
  currentPlantName: string | null
}

export type SensorWithAlert = Sensor & {
  latestReading: Reading | null
  threshold: PlantThreshold | null
  hasAlert: boolean
  alertBreachDirection: 'high' | 'low' | null
}

/** harvested_at が確定している収穫済みレコード */
export type HarvestedZonePlant = Omit<ZonePlant, 'harvested_at'> & {
  harvested_at: string
}

export type ZoneDetailData = {
  zone: Zone
  devices: Device[]
  sensors: SensorWithAlert[]
  unresolvedAlerts: Alert[]
  currentPlant: ZonePlant | null
  pastPlants: HarvestedZonePlant[]
  isOffline: boolean
  latestLastSeen: string | null
}

export type ChartPeriod = '24h' | '7d' | '30d'

export type ChartDataPoint = {
  recorded_at: string
  value: number
}
