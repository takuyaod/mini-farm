import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { Plant, PlantThreshold, SensorTypeMaster } from '../types'

export type PlantPageData = {
  plants: Plant[]
  sensorTypes: SensorTypeMaster[]
  thresholdsByPlantId: Record<string, PlantThreshold[]>
}

export async function getPlantPageData(): Promise<PlantPageData> {
  const supabase = await createClient()

  const [plantsRes, sensorTypesRes, thresholdsRes] = await Promise.all([
    supabase.from('plants').select('*').order('name', { ascending: true }),
    supabase.from('sensor_type_masters').select('*').order('label', { ascending: true }),
    supabase.from('plant_thresholds').select('*'),
  ])

  const plants = (plantsRes.data ?? []) as Plant[]
  const thresholds = (thresholdsRes.data ?? []) as PlantThreshold[]

  const thresholdsByPlantId: Record<string, PlantThreshold[]> = {}
  for (const plant of plants) {
    thresholdsByPlantId[plant.id] = thresholds.filter((t) => t.plant_id === plant.id)
  }

  return {
    plants,
    sensorTypes: (sensorTypesRes.data ?? []) as SensorTypeMaster[],
    thresholdsByPlantId,
  }
}
