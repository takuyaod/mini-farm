import { AlertTriangle, Wifi, Bell, Clock } from 'lucide-react'
import type { AlertSummary } from '../types'

type Props = {
  summary: AlertSummary
}

function formatAvgTime(minutes: number | null): string {
  if (minutes === null) return '-'
  if (minutes < 60) return `${minutes}分`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間`
  return `${Math.floor(hours / 24)}日`
}

function calcDiff(current: number | null, prev: number | null): { label: string; positive: boolean } | null {
  if (current === null || prev === null || prev === 0) return null
  const diff = Math.round(((current - prev) / prev) * 100)
  if (diff === 0) return null
  return { label: `先週比 ${diff > 0 ? '+' : ''}${diff}%`, positive: diff < 0 }
}

export function AlertSummaryCards({ summary }: Props) {
  const avgDiff = calcDiff(summary.avgResolveMinutes, summary.avgResolveMinutesPrevWeek)

  const cards = [
    {
      label: '閾値超過（未解消）',
      value: summary.unresolvedThreshold,
      icon: <AlertTriangle className="h-5 w-5" />,
      iconBg: '#fceeec',
      iconColor: '#d6452c',
      valueColor: summary.unresolvedThreshold > 0 ? '#b9351f' : '#0f1a14',
      sub: null,
    },
    {
      label: 'センサー異常（未解消）',
      value: summary.unresolvedSensorFault,
      icon: <Wifi className="h-5 w-5" />,
      iconBg: '#fdf3e2',
      iconColor: '#b1740a',
      valueColor: summary.unresolvedSensorFault > 0 ? '#b1740a' : '#0f1a14',
      sub: null,
    },
    {
      label: '今日の発報件数',
      value: summary.todayTotal,
      icon: <Bell className="h-5 w-5" />,
      iconBg: '#ecf5ee',
      iconColor: '#246e3a',
      valueColor: '#0f1a14',
      sub: null,
    },
    {
      label: '平均解消時間',
      value: formatAvgTime(summary.avgResolveMinutes),
      icon: <Clock className="h-5 w-5" />,
      iconBg: '#eef1ed',
      iconColor: '#4b5a52',
      valueColor: '#0f1a14',
      sub: avgDiff
        ? { text: avgDiff.label, positive: avgDiff.positive }
        : summary.avgResolveMinutesPrevWeek === null
          ? { text: '先週データなし', positive: true }
          : null,
    },
  ] as const

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex flex-col gap-3 rounded-xl bg-white p-4"
          style={{
            border: '1px solid #e6e9e5',
            boxShadow: '0 1px 0 rgba(15,26,20,.02), 0 1px 2px rgba(15,26,20,.04)',
          }}
        >
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-medium text-[#4b5a52]">{card.label}</p>
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: card.iconBg, color: card.iconColor }}
            >
              {card.icon}
            </span>
          </div>
          <div>
            <p
              className="text-[26px] font-bold tabular-nums leading-none"
              style={{ color: card.valueColor, fontVariantNumeric: 'tabular-nums' }}
            >
              {card.value}
            </p>
            {card.sub && (
              <p
                className="mt-1 text-[11px] font-medium"
                style={{ color: card.sub.positive ? '#246e3a' : '#b9351f' }}
              >
                {card.sub.text}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
