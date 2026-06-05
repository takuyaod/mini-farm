import { calcCultivationDays, formatPlantingDate } from '../utils'
import type { HarvestedZonePlant } from '../types'

type Props = {
  pastPlants: HarvestedZonePlant[]
}

export function CultivationHistory({ pastPlants }: Props) {
  return (
    <section className="rounded-xl bg-white ring-1 ring-[#e6e9e5] shadow-sm">
      <div className="px-6 pt-5 pb-4">
        <h2 className="text-[15px] font-semibold tracking-tight text-content-primary">
          栽培履歴{' '}
          <span className="tabular-nums text-content-secondary">({pastPlants.length})</span>
        </h2>
      </div>

      {pastPlants.length === 0 ? (
        <div className="px-6 pb-6 text-[13px] text-content-muted">
          過去の収穫記録がありません
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-t border-[#eef1ed] bg-[#f7f8f6] text-left text-[11.5px] font-medium text-content-secondary">
                <th className="px-6 py-2.5">植物名</th>
                <th className="px-4 py-2.5">植付日</th>
                <th className="px-4 py-2.5">収穫日</th>
                <th className="px-4 py-2.5 tabular-nums">栽培日数</th>
                <th className="px-4 py-2.5 tabular-nums">収穫量</th>
                <th className="px-4 py-2.5 pr-6">メモ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef1ed]">
              {pastPlants.map((entry) => {
                const days = calcCultivationDays(entry.planted_at, entry.harvested_at)
                return (
                  <tr key={entry.id} className="hover:bg-[#f7f8f6]">
                    <td className="px-6 py-3 font-medium text-content-primary">
                      {entry.plants.name}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-content-secondary">
                      {formatPlantingDate(entry.planted_at)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-content-secondary">
                      {formatPlantingDate(entry.harvested_at)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-content-secondary">
                      {days} 日
                    </td>
                    <td className="px-4 py-3 tabular-nums text-content-secondary">
                      {entry.harvest_weight_g != null
                        ? `${entry.harvest_weight_g} g`
                        : '記録なし'}
                    </td>
                    <td className="px-4 py-3 pr-6 text-content-muted">
                      {entry.notes ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
