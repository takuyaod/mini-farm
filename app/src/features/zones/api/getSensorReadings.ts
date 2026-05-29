import { createClient } from '@/lib/supabase/client'
import type { ChartDataPoint, ChartPeriod } from '../types'

function aggregateByHour(data: ChartDataPoint[]): ChartDataPoint[] {
  const hourlyMap = new Map<string, number[]>()
  for (const { recorded_at, value } of data) {
    const d = new Date(recorded_at)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}T${String(d.getUTCHours()).padStart(2, '0')}`
    if (!hourlyMap.has(key)) hourlyMap.set(key, [])
    hourlyMap.get(key)!.push(value)
  }
  return Array.from(hourlyMap.entries())
    .map(([key, values]) => ({
      recorded_at: `${key}:00:00Z`,
      value: values.reduce((a, b) => a + b, 0) / values.length,
    }))
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
}

function aggregateByDay(data: ChartDataPoint[]): ChartDataPoint[] {
  const dailyMap = new Map<string, number[]>()
  for (const { recorded_at, value } of data) {
    const key = new Date(recorded_at).toISOString().slice(0, 10)
    if (!dailyMap.has(key)) dailyMap.set(key, [])
    dailyMap.get(key)!.push(value)
  }
  return Array.from(dailyMap.entries())
    .map(([key, values]) => ({
      recorded_at: `${key}T00:00:00Z`,
      value: values.reduce((a, b) => a + b, 0) / values.length,
    }))
    .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
}

const PERIOD_INTERVALS: Record<ChartPeriod, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

export async function getSensorReadings(
  sensorId: string,
  period: ChartPeriod
): Promise<ChartDataPoint[]> {
  const supabase = createClient()
  const since = new Date(Date.now() - PERIOD_INTERVALS[period]).toISOString()

  const { data, error } = await supabase
    .from('readings')
    .select('recorded_at, value')
    .eq('sensor_id', sensorId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true })

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []

  if (period === '24h') return data as ChartDataPoint[]
  if (period === '7d') return aggregateByHour(data as ChartDataPoint[])
  return aggregateByDay(data as ChartDataPoint[])
}
