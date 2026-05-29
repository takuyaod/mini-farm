import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChartDataPoint, ChartPeriod } from '../types'

export async function getSensorReadings(
  supabase: SupabaseClient,
  sensorId: string,
  period: ChartPeriod
): Promise<ChartDataPoint[]> {
  const now = Date.now()

  if (period === '24h') {
    const since = new Date(now - 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('readings')
      .select('recorded_at, value')
      .eq('sensor_id', sensorId)
      .gte('recorded_at', since)
      .order('recorded_at', { ascending: true })
    return data ?? []
  }

  const days = period === '7d' ? 7 : 30
  const since = new Date(now - days * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('readings')
    .select('recorded_at, value')
    .eq('sensor_id', sensorId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true })

  if (!data || data.length === 0) return []

  const truncTo =
    period === '7d'
      ? (d: Date) =>
          new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).toISOString()
      : (d: Date) =>
          new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()

  const groups = new Map<string, number[]>()
  for (const r of data) {
    const key = truncTo(new Date(r.recorded_at))
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r.value)
  }

  return Array.from(groups.entries())
    .map(([recorded_at, values]) => ({
      recorded_at,
      value: values.reduce((a, b) => a + b, 0) / values.length,
    }))
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
}
