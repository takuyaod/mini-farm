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

export function formatDateTime(dateStr: string): string {
  // timeZone を明示することで、サーバー（Node.jsプロセスのTZ）とブラウザのローカルTZが
  // 異なる環境でも出力が変わらないようにし、hydration mismatchを防ぐ
  // （app/(main)/zones/[id]/page.tsx の最終同期表示と同じパターン）
  return new Date(dateStr).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value)
}

/** devices.name のバリデーション上限文字数（DATA_MODEL.md の devices.name VARCHAR(100) に合わせる） */
export const DEVICE_NAME_MAX_LENGTH = 100
