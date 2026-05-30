'use client'

import { useState, useEffect } from 'react'
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
import { Button } from '@/components/ui/button'
import { getSensorReadings } from '../api/getSensorReadings'
import type { ChartDataPoint, ChartPeriod, PlantThreshold } from '../types'

type Props = {
  sensorId: string
  sensorLabel: string
  sensorUnit?: string
  threshold: PlantThreshold | null
}

const PERIODS: { value: ChartPeriod; label: string }[] = [
  { value: '24h', label: '24時間' },
  { value: '7d', label: '7日' },
  { value: '30d', label: '30日' },
]

function formatTimestamp(dateStr: string, period: ChartPeriod): string {
  const date = new Date(dateStr)
  if (period === '24h') {
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }
  if (period === '7d') {
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}時`
  }
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function formatTooltipTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

type CustomTooltipProps = {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
  unit?: string
}

function CustomTooltip({ active, payload, label, unit }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-md border bg-white px-3 py-2 shadow-md text-xs">
      <p className="text-gray-500">{label ? formatTooltipTime(label) : ''}</p>
      <p className="font-semibold text-gray-900">
        {payload[0].value.toFixed(2)}
        {unit && <span className="ml-0.5 font-normal text-gray-500">{unit}</span>}
      </p>
    </div>
  )
}

function calcSummary(data: ChartDataPoint[]) {
  if (data.length === 0) return null
  const values = data.map((d) => d.value)
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
  }
}

export function SensorChart({ sensorId, sensorLabel, sensorUnit, threshold }: Props) {
  const [period, setPeriod] = useState<ChartPeriod>('24h')
  const [data, setData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFetchError(null)
    getSensorReadings(sensorId, period)
      .then((rows) => {
        if (!cancelled) {
          setData(rows)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFetchError(err instanceof Error ? err.message : 'データの取得に失敗しました')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [sensorId, period])

  const summary = calcSummary(data)

  const yDomain: [number | 'auto', number | 'auto'] =
    threshold !== null && threshold.alert_min !== null && threshold.alert_max !== null
      ? [
          Math.min(threshold.alert_min, data.length > 0 ? Math.min(...data.map((d) => d.value)) : 0),
          Math.max(threshold.alert_max, data.length > 0 ? Math.max(...data.map((d) => d.value)) : 100),
        ]
      : ['auto', 'auto']

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-700">{sensorLabel} グラフ</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setPeriod(p.value)}
              className={period === p.value ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">
          読み込み中...
        </div>
      ) : fetchError ? (
        <div className="flex h-48 items-center justify-center text-sm text-red-400">
          {fetchError}
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-400">
          データなし
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="recorded_at"
              tickFormatter={(v) => formatTimestamp(v, period)}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip
              content={<CustomTooltip unit={sensorUnit} />}
              cursor={{ stroke: '#d1d5db', strokeWidth: 1 }}
            />

            {threshold !== null &&
              threshold.optimal_min !== null &&
              threshold.optimal_max !== null && (
                <ReferenceArea
                  y1={threshold.optimal_min}
                  y2={threshold.optimal_max}
                  fill="#bbf7d0"
                  fillOpacity={0.4}
                />
              )}

            {threshold !== null && threshold.alert_min !== null && (
              <ReferenceLine
                y={threshold.alert_min}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            )}
            {threshold !== null && threshold.alert_max !== null && (
              <ReferenceLine
                y={threshold.alert_max}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            )}

            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {summary && (
        <div className="mt-3 flex gap-4 border-t pt-3 text-xs text-gray-500">
          <span>
            最小: <span className="font-medium text-gray-700">{summary.min.toFixed(2)}{sensorUnit}</span>
          </span>
          <span>
            最大: <span className="font-medium text-gray-700">{summary.max.toFixed(2)}{sensorUnit}</span>
          </span>
          <span>
            平均: <span className="font-medium text-gray-700">{summary.avg.toFixed(2)}{sensorUnit}</span>
          </span>
        </div>
      )}
    </div>
  )
}
