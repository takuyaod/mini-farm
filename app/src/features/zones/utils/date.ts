export const DAY_MS = 24 * 60 * 60 * 1000

export function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / DAY_MS)
}
