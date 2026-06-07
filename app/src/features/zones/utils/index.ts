export function getDaysFromPlanting(plantedAt: string): number {
  return Math.floor((Date.now() - new Date(plantedAt).getTime()) / (1000 * 60 * 60 * 24))
}

export function calcCultivationDays(plantedAt: string, harvestedAt: string): number {
  return Math.floor(
    (new Date(harvestedAt).getTime() - new Date(plantedAt).getTime()) / (1000 * 60 * 60 * 24)
  )
}

export function formatPlantingDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
