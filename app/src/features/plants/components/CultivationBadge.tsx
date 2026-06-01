import type { Plant } from '../types'

type CultivationBadgeProps = {
  type: Plant['cultivation_type']
}

export function CultivationBadge({ type }: CultivationBadgeProps) {
  const config = {
    hydroponic: { label: '水耕', className: 'bg-[#eaf2fb] text-[#1f6fd1]' },
    soil: { label: '土壌', className: 'bg-[#ecf5ee] text-[#246e3a]' },
    both: { label: '両対応', className: 'bg-[#f2edfb] text-[#6d3fc4]' },
  }
  const { label, className } = config[type]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
