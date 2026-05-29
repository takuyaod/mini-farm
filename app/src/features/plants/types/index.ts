export type CultivationType = 'hydroponic' | 'soil' | 'both'

export type Plant = {
  id: string
  name: string
  cultivation_type: CultivationType
}

export type SensorTypeMaster = {
  id: string
  label: string
  unit: string | null
  cultivation_type: CultivationType
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

