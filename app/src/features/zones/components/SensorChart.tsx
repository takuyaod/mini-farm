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
import { getSensorReadings } from '../api/getSensorReadings'
import type { ChartDataPoint, ChartPeriod, PlantThreshold } from '../types'

type Props = {
  sensorId: string
  sensorLabel: string
  sensorUnit?: string
  threshold: PlantThreshold | null
  hasAlert: boolean
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
    <div className="rounded-md border border-surface-border bg-white px-3 py-2 shadow-md text-xs">
      <p className="text-content-secondary">{label ? formatTooltipTime(label) : ''}</p>
      <p className="font-semibold text-content-primary">
        {payload[0].value.toFixed(2)}
        {unit && <span className="ml-0.5 font-normal text-content-secondary">{unit}</span>}
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

export function SensorChart({ sensorId, sensorLabel, sensorUnit, threshold, hasAlert }: Props) {
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
  const lineColor = hasAlert ? '#b9351f' : '#246e3a'

  const yDomain: [number | 'auto', number | 'auto'] =
    threshold !== null && threshold.alert_min !== null && threshold.alert_max !== null
      ? [
          Math.min(threshold.alert_min, data.length > 0 ? Math.min(...data.map((d) => d.value)) : 0),
          Math.max(threshold.alert_max, data.length > 0 ? Math.max(...data.map((d) => d.value)) : 100),
        ]
      : ['auto', 'auto']

  const showThresholdInfo =
    threshold &&
    (threshold.optimal_min !== null || threshold.optimal_max !== null)

  return (
    <section className="rounded-xl bg-white ring-1 ring-[#e6e9e5] shadow-sm">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 px-6 pt-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[18px] font-semibold tracking-tight">{sensorLabel} の推移</h2>
            {hasAlert && (
              <span className="inline-flex items-center rounded-full bg-[#fceeec] px-2 py-0.5 text-[11px] font-medium text-[#b9351f] ring-1 ring-inset ring-[#f6d8d3]">
                アラート中
              </span>
            )}
          </div>
          {showThresholdInfo && (
            <p className="mt-1 text-[12px] text-[#8a978f]">
              適正範囲{' '}
              <span className="font-mono tabular-nums text-[#246e3a]">
                {threshold.optimal_min}–{threshold.optimal_max}
                {sensorUnit ? ` ${sensorUnit}` : ''}
              </span>
              {(threshold.alert_min !== null || threshold.alert_max !== null) && (
                <>
                  {' · '}警告閾値{' '}
                  <span className="font-mono tabular-nums text-[#b9351f]">
                    {threshold.alert_min ?? '–'} / {threshold.alert_max ?? '–'}
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 rounded-lg bg-[#f7f8f6] p-0.5 ring-1 ring-[#e6e9e5]">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`rounded-md px-3 py-1 text-[12px] font-medium transition-colors ${
                period === p.value
                  ? 'bg-white text-[#0f1a14] shadow-sm'
                  : 'text-[#8a978f] hover:text-[#0f1a14]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 px-6 text-[11px] text-[#4b5a52]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-[#2f8a4a]/30 ring-1 ring-[#2f8a4a]/40" />
          適正範囲
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="block h-0 w-4 border-t-[1.5px] border-dashed border-[#d6452c]" />
          警告閾値
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="block h-0.5 w-4 rounded"
            style={{ backgroundColor: lineColor }}
          />
          実測値
        </span>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex h-48 items-center justify-center px-6 py-4 text-sm text-content-muted">
          読み込み中...
        </div>
      ) : fetchError ? (
        <div className="flex h-48 items-center justify-center px-6 py-4 text-sm text-alert-text">
          {fetchError}
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-48 items-center justify-center px-6 py-4 text-sm text-content-muted">
          データなし
        </div>
      ) : (
        <div className="px-2 pt-2">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1ed" />
              <XAxis
                dataKey="recorded_at"
                tickFormatter={(v) => formatTimestamp(v, period)}
                tick={{ fontSize: 10, fill: '#8a978f' }}
                tickLine={false}
                axisLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={yDomain}
                tick={{ fontSize: 10, fill: '#8a978f' }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                content={<CustomTooltip unit={sensorUnit} />}
                cursor={{ stroke: '#e6e9e5', strokeWidth: 1 }}
              />

              {threshold !== null &&
                threshold.optimal_min !== null &&
                threshold.optimal_max !== null && (
                  <ReferenceArea
                    y1={threshold.optimal_min}
                    y2={threshold.optimal_max}
                    fill="#2f8a4a"
                    fillOpacity={0.1}
                  />
                )}

              {threshold !== null && threshold.alert_min !== null && (
                <ReferenceLine
                  y={threshold.alert_min}
                  stroke="#d6452c"
                  strokeDasharray="4 4"
                  strokeWidth={1.25}
                />
              )}
              {threshold !== null && threshold.alert_max !== null && (
                <ReferenceLine
                  y={threshold.alert_max}
                  stroke="#d6452c"
                  strokeDasharray="4 4"
                  strokeWidth={1.25}
                />
              )}

              <Line
                type="monotone"
                dataKey="value"
                stroke={lineColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: lineColor }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary grid */}
      {summary && (
        <div className="grid grid-cols-3 border-t border-[#eef1ed]">
          {[
            { label: '最小', value: summary.min, color: 'text-[#1f6fd1]' },
            { label: '最大', value: summary.max, color: 'text-[#b9351f]' },
            { label: '平均', value: summary.avg, color: 'text-[#0f1a14]' },
          ].map((s, i) => (
            <div key={i} className={`px-6 py-4 ${i > 0 ? 'border-l border-[#eef1ed]' : ''}`}>
              <div className="text-[10px] font-medium uppercase tracking-wider text-[#8a978f]">
                {s.label}
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span
                  className={`text-[20px] font-semibold tracking-tight tabular-nums ${s.color}`}
                >
                  {s.value.toFixed(2)}
                </span>
                {sensorUnit && (
                  <span className="text-[11px] text-[#8a978f]">{sensorUnit}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
