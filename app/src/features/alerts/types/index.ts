export type AlertWithContext = {
  id: string
  sensor_id: string
  alert_type: 'threshold_breach' | 'sensor_fault'
  triggered_value: number | null
  breach_direction: 'high' | 'low' | null
  started_at: string
  resolved_at: string | null
  sensorLabel: string
  sensorTypeId: string
  unit: string | null
  zoneId: string
  zoneName: string
  plantName: string | null
  alertThresholdValue: number | null
  deviceId?: string | null
}

export type AlertCursor = {
  started_at: string
  id: string
}

export type AlertTypeFilter = 'all' | 'high' | 'low' | 'sensor_fault'

export type GetAlertsParams = {
  tab: 'unresolved' | 'resolved'
  zoneId?: string
  typeFilter?: AlertTypeFilter
  cursor?: AlertCursor
}

export type AlertsResult = {
  alerts: AlertWithContext[]
  totalCount: number
}

export type AlertSummary = {
  unresolvedThreshold: number
  unresolvedSensorFault: number
  todayTotal: number
  avgResolveMinutes: number | null
  avgResolveMinutesPrevWeek: number | null
}
