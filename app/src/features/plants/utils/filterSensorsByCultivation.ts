import type { CultivationType, SensorTypeMaster } from '../types'

export function filterSensorsByCultivation(
  sensorTypes: SensorTypeMaster[],
  cultivationType: CultivationType
): SensorTypeMaster[] {
  return sensorTypes.filter(
    (st) =>
      st.cultivation_type === cultivationType ||
      st.cultivation_type === 'both' ||
      cultivationType === 'both'
  )
}
