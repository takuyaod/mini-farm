'use client'

type ThresholdScaleProps = {
  alertMin: number | null
  optimalMin: number | null
  optimalMax: number | null
  alertMax: number | null
  unit?: string | null
  isInvalid?: boolean
}

type LabelConfig = {
  value: number | null
  label: string
  color: string
}

function buildLabelConfigs(
  alertMin: number | null,
  optimalMin: number | null,
  optimalMax: number | null,
  alertMax: number | null,
  isInvalid: boolean,
): LabelConfig[] {
  const alertColor = isInvalid ? '#b9351f' : '#b9351f'
  const optimalColor = isInvalid ? '#b9351f' : '#246e3a'
  return [
    { value: alertMin, label: '警下限', color: alertColor },
    { value: optimalMin, label: '適正下限', color: optimalColor },
    { value: optimalMax, label: '適正上限', color: optimalColor },
    { value: alertMax, label: '警上限', color: alertColor },
  ]
}

export function ThresholdScale({
  alertMin,
  optimalMin,
  optimalMax,
  alertMax,
  unit,
  isInvalid = false,
}: ThresholdScaleProps) {
  const hasValues =
    alertMin !== null ||
    optimalMin !== null ||
    optimalMax !== null ||
    alertMax !== null

  if (!hasValues) {
    return (
      <div className="flex h-6 items-center">
        <span className="text-xs text-[#8a978f]">未設定</span>
      </div>
    )
  }

  const formatVal = (v: number | null) => {
    if (v === null) return '–'
    return unit ? `${v}${unit}` : String(v)
  }

  const labelConfigs = buildLabelConfigs(alertMin, optimalMin, optimalMax, alertMax, isInvalid)

  const renderLabels = (configs: LabelConfig[], applyNullColor: boolean) => (
    <div className="flex justify-between">
      {configs.map(({ value, label, color }) => (
        <div key={label} className="flex flex-col items-center">
          <span
            className="font-jetbrains-mono text-[10px] tabular-nums"
            style={{ color: applyNullColor && value === null ? '#8a978f' : color }}
          >
            {formatVal(value)}
          </span>
          <span className="text-[9px] text-[#8a978f]">{label}</span>
        </div>
      ))}
    </div>
  )

  if (isInvalid) {
    return (
      <div className="flex flex-col gap-1">
        <div className="h-2.5 w-full rounded-full bg-[#f0b4b0]" role="presentation" />
        {renderLabels(labelConfigs, false)}
      </div>
    )
  }

  // 4つの値がすべて揃っている場合は動的セグメントバーを表示
  const allDefined =
    alertMin !== null &&
    optimalMin !== null &&
    optimalMax !== null &&
    alertMax !== null

  if (allDefined) {
    const total = alertMax! - alertMin!

    // 5セグメント構成: 警告域(赤・端) | 警告余裕(黄) | 適正(緑) | 警告余裕(黄) | 警告域(赤・端)
    // 両端の警告域に固定2%ずつ割り当て、残りを実際の範囲比率で分割する
    // total === 0（全閾値が同一点）の場合はバー全体を赤単色で表示する
    const endBuffer = 2
    const innerTotal = 100 - endBuffer * 2

    if (total === 0) {
      // すべての閾値が同じ値: 正規バーとして描画できないため単色赤バーで表示
      return (
        <div className="flex flex-col gap-1">
          <div className="h-2.5 w-full rounded-full bg-[#f0b4b0]" role="presentation" />
          {renderLabels(labelConfigs, false)}
        </div>
      )
    }

    const leftYellowWidth = ((optimalMin! - alertMin!) / total) * innerTotal
    const greenWidth = ((optimalMax! - optimalMin!) / total) * innerTotal
    const rightYellowWidth = innerTotal - leftYellowWidth - greenWidth

    return (
      <div className="flex flex-col gap-1">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full" role="presentation">
          <div style={{ width: `${endBuffer}%`, backgroundColor: '#f0b4b0' }} />
          <div style={{ width: `${Math.max(leftYellowWidth, 0)}%`, backgroundColor: '#f7e6c4' }} />
          <div style={{ width: `${Math.max(greenWidth, 0)}%`, backgroundColor: '#2f8a4a' }} />
          <div style={{ width: `${Math.max(rightYellowWidth, 0)}%`, backgroundColor: '#f7e6c4' }} />
          <div style={{ width: `${endBuffer}%`, backgroundColor: '#f0b4b0' }} />
        </div>
        {renderLabels(labelConfigs, false)}
      </div>
    )
  }

  // 一部の値のみ定義されている場合はグラデーションバー + 2行ラベル
  return (
    <div className="flex flex-col gap-1">
      <div
        className="h-2.5 w-full rounded-full"
        style={{ background: 'linear-gradient(to right, #f0b4b0, #f7e6c4, #d6ead9, #f7e6c4, #f0b4b0)' }}
        role="presentation"
      />
      {renderLabels(labelConfigs, true)}
    </div>
  )
}
