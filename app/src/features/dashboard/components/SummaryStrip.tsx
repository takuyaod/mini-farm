import { Activity, AlertTriangle, Cpu, Layers3 } from 'lucide-react'
import type { DashboardSummary } from '../types'

type Props = {
  summary: DashboardSummary
}

type Item = {
  icon: React.ReactNode
  label: string
  value: number
  unit: string
  colorClass?: string
}

export function SummaryStrip({ summary }: Props) {
  const alertColorClass =
    summary.unresolvedAlertCount > 0
      ? 'bg-[#fceeec] text-[#b9351f]'
      : 'bg-[#ecf5ee] text-[#246e3a]'

  const alertIconClass =
    summary.unresolvedAlertCount > 0 ? 'text-[#b9351f]' : 'text-[#246e3a]'

  const items: Item[] = [
    {
      icon: <Layers3 className="h-5 w-5 text-[#246e3a]" />,
      label: 'ゾーン',
      value: summary.zoneCount,
      unit: '',
    },
    {
      icon: <Cpu className="h-5 w-5 text-[#246e3a]" />,
      label: '接続デバイス',
      value: summary.deviceCount,
      unit: '台',
    },
    {
      icon: <Activity className="h-5 w-5 text-[#246e3a]" />,
      label: '監視センサー',
      value: summary.sensorCount,
      unit: 'ch',
    },
    {
      icon: <AlertTriangle className={`h-5 w-5 ${alertIconClass}`} />,
      label: '未解消アラート',
      value: summary.unresolvedAlertCount,
      unit: '件',
      colorClass: alertColorClass,
    },
  ]

  return (
    <div className="flex overflow-hidden rounded-xl bg-white ring-1 ring-[#e6e9e5]">
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`flex flex-1 items-center gap-3 px-5 py-4 ${
            index !== 0 ? 'border-l border-[#eef1ed]' : ''
          }`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              item.colorClass ?? 'bg-[#ecf5ee]'
            }`}
          >
            {item.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#6b7a69]">{item.label}</p>
            <p className="text-[22px] font-semibold tabular-nums leading-tight text-[#1a2e1a]">
              {item.value}
              {item.unit && (
                <span className="ml-0.5 text-sm font-normal text-[#6b7a69]">{item.unit}</span>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
