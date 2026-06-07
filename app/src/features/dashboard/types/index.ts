export type {
  Alert,
  Device,
  Plant,
  PlantThreshold,
  Reading,
  Sensor,
  SensorTypeMaster,
  Zone,
  ZonePlant,
} from '@/types'

import type { Alert, Device, Plant, PlantThreshold, Reading, Sensor, Zone, ZonePlant } from '@/types'

export type SensorWithReading = Sensor & {
  latestReading: Reading | null
  threshold: PlantThreshold | null
  hasAlert: boolean
}

export type ZoneCardData = {
  zone: Zone
  devices: Device[]
  sensorsWithReadings: SensorWithReading[]
  unresolvedAlerts: Alert[]
  currentPlant: (ZonePlant & { plants: Plant }) | null
  isOffline: boolean
  lastSeenAt: string | null
}

export type DashboardSummary = {
  zoneCount: number
  deviceCount: number
  sensorCount: number
  unresolvedAlertCount: number
}

export type DashboardData = {
  zones: ZoneCardData[]
  totalUnresolvedAlerts: number
  summary: DashboardSummary
}
