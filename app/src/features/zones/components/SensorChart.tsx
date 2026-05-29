'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { getSensorReadings } from '../api/getSensorReadings'
import type { SensorWithReadingDetail, ChartPeriod, ChartDataPoint } from '../types'

type Props = {
  sensor: SensorWithReadingDetail
}

const PERIODS: { label: string; value: ChartPeriod }[] = [
  { label: '24時間', value: '24h' },
  { label: '7日', value: '7d' },
  { label: '30日', value: '30d' },
]

function formatXAxis(recorded_at: string, period: ChartPeriod): string {
  const d = new Date(recorded_at)
  if (period === '24h') {
    return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }
  if (period === '7d') {
    return d.toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit' })
  }
  return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })
}

function formatTooltipLabel(recorded_at: string, period: ChartPeriod): string {
  const d = new Date(recorded_at)
  if (period === '24h') {
    return d.toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  if (period === '7d') {
    return d.toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  return d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function SensorChart({ sensor }: Props) {
  const [period, setPeriod] = useState<ChartPeriod>('24h')
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const label = sensor.label ?? sensor.sensor_type_masters.label
  const unit = sensor.sensor_type_masters.unit
  const threshold = sensor.threshold

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const readings = await getSensorReadings(supabase, sensor.id, period)
      setData(readings)
    } finally {
      setIsLoading(false)
    }
  }, [sensor.id, period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const values = data.map((d) => d.value)
  const minVal = values.length > 0 ? Math.min(...values) : null
  const maxVal = values.length > 0 ? Math.max(...values) : null
  const avgVal =
    values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null

  const yDomain: [number | 'auto', number | 'auto'] = (() => {
    const allValues = [
      ...values,
      threshold?.alert_min,
      threshold?.alert_max,
      threshold?.optimal_min,
      threshold?.optimal_max,
    ].filter((v): v is number => v !== null && v !== undefined)

    if (allValues.length === 0) return ['auto', 'auto']
    const min = Math.min(...allValues)
    const max = Math.max(...allValues)
    const padding = (max - min) * 0.1 || 1
    return [min - padding, max + padding]
  })()

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-medium text-gray-900">{label}</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                period === p.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">
          読み込み中...
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">
          データがありません
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="recorded_at"
              tickFormatter={(v) => formatXAxis(v, period)}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickFormatter={(v) => (unit ? `${v}${unit}` : String(v))}
            />
            <Tooltip
              labelFormatter={(v) => formatTooltipLabel(String(v), period)}
              formatter={(v: number) => [
                `${v.toFixed(2)}${unit ?? ''}`,
                label,
              ]}
              contentStyle={{ fontSize: 12 }}
            />
            {threshold?.optimal_min !== null &&
              threshold?.optimal_max !== null &&
              threshold?.optimal_min !== undefined &&
              threshold?.optimal_max !== undefined && (
                <ReferenceArea
                  y1={threshold.optimal_min}
                  y2={threshold.optimal_max}
                  fill="#22c55e"
                  fillOpacity={0.1}
                />
              )}
            {threshold?.alert_min !== null && threshold?.alert_min !== undefined && (
              <ReferenceLine
                y={threshold.alert_min}
                stroke="#ef4444"
                strokeDasharray="4 2"
                strokeWidth={1}
              />
            )}
            {threshold?.alert_max !== null && threshold?.alert_max !== undefined && (
              <ReferenceLine
                y={threshold.alert_max}
                stroke="#ef4444"
                strokeDasharray="4 2"
                strokeWidth={1}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {!isLoading && values.length > 0 && (
        <div className="mt-3 flex justify-around border-t pt-3 text-center">
          <div>
            <p className="text-xs text-gray-500">最小</p>
            <p className="text-sm font-semibold text-gray-900">
              {minVal?.toFixed(2)}
              {unit && <span className="text-xs font-normal text-gray-500">{unit}</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">最大</p>
            <p className="text-sm font-semibold text-gray-900">
              {maxVal?.toFixed(2)}
              {unit && <span className="text-xs font-normal text-gray-500">{unit}</span>}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">平均</p>
            <p className="text-sm font-semibold text-gray-900">
              {avgVal?.toFixed(2)}
              {unit && <span className="text-xs font-normal text-gray-500">{unit}</span>}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
