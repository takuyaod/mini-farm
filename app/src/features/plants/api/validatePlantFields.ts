export type PlantFieldError = string | null

/**
 * name と cultivation_type の共通バリデーション。
 * エラーがなければ null を返す。
 */
export function validatePlantFields(
  name: string,
  cultivation_type: string | null
): PlantFieldError {
  if (!name) return '植物名を入力してください'
  if (name.length > 100) return '植物名は100文字以内で入力してください'
  if (
    cultivation_type !== 'hydroponic' &&
    cultivation_type !== 'soil' &&
    cultivation_type !== 'both'
  ) {
    return '栽培方式を選択してください'
  }
  return null
}
