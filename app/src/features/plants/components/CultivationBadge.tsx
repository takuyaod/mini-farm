import { Droplets, Layers, Sprout } from 'lucide-react'
import type { Plant } from '../types'

type CultivationBadgeProps = {
  type: Plant['cultivation_type']
}

export function CultivationBadge({ type }: CultivationBadgeProps) {
  const config = {
    hydroponic: {
      label: '水耕',
      className: 'bg-[#eaf2fb] text-[#1f6fd1] ring-1 ring-inset ring-[#d3e3f7]',
      Icon: Droplets,
    },
    soil: {
      label: '土壌',
      className: 'bg-[#ecf5ee] text-[#246e3a] ring-1 ring-inset ring-[#c8e0cd]',
      Icon: Sprout,
    },
    both: {
      label: '両対応',
      className: 'bg-[#f2edfb] text-[#6d3fc4] ring-1 ring-inset ring-[#dbd3f7]',
      Icon: Layers,
    },
  }
  const { label, className, Icon } = config[type]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      <Icon size={11} strokeWidth={2.25} />
      {label}
    </span>
  )
}
