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
}

export type GetAlertsParams = {
  tab: 'unresolved' | 'resolved'
  zoneId?: string
  cursor?: string
}

export type AlertsResult = {
  alerts: AlertWithContext[]
  totalCount: number
}
