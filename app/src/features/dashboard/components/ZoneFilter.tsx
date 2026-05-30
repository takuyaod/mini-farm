'use client'

import { useState } from 'react'
import { ZoneCard } from './ZoneCard'
import type { ZoneCardData } from '../types'

type FilterTab = 'all' | 'hydroponic' | 'soil' | 'alert'

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'hydroponic', label: '水耕' },
  { id: 'soil', label: '土耕' },
  { id: 'alert', label: '要対応' },
]

type Props = {
  zones: ZoneCardData[]
}

export function ZoneFilter({ zones }: Props) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

  const filteredZones = zones.filter((data) => {
    if (activeTab === 'all') return true
    if (activeTab === 'hydroponic') return data.zone.type === 'hydroponic'
    if (activeTab === 'soil') return data.zone.type === 'soil'
    if (activeTab === 'alert') return data.unresolvedAlerts.length > 0
  })

  return (
    <div>
      {/* 見出し行 */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0f1a14]">栽培ゾーン</h2>
        {/* フィルタータブ */}
        <div className="bg-white p-0.5 ring-1 ring-[#e6e9e5] rounded-lg flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#eef1ed] text-[#0f1a14] rounded-md'
                  : 'text-[#8a978f] hover:text-[#0f1a14] rounded-md'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ゾーングリッド */}
      {filteredZones.length > 0 ? (
        <div
          className={filteredZones.length === 1 ? 'flex flex-col' : 'grid gap-4'}
          style={
            filteredZones.length > 1
              ? { gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }
              : undefined
          }
        >
          {filteredZones.map((zoneData) => (
            <ZoneCard key={zoneData.zone.id} data={zoneData} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-[#8a978f]">
          該当するゾーンがありません
        </p>
      )}
    </div>
  )
}
