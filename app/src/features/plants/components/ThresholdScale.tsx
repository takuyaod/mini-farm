'use client'

type ThresholdScaleProps = {
  alertMin: number | null
  optimalMin: number | null
  optimalMax: number | null
  alertMax: number | null
  unit?: string | null
  isInvalid?: boolean
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

  const gradientClass = isInvalid
    ? 'bg-[#f0b4b0]'
    : 'bg-gradient-to-r from-[#f0b4b0] via-[#f7e6c4] via-[#d6ead9] via-[#f7e6c4] to-[#f0b4b0]'

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`h-2.5 w-full rounded-full ${gradientClass}`}
        role="presentation"
      />
      <div className="flex justify-between">
        <span
          className={`font-jetbrains-mono text-[10px] tabular-nums ${isInvalid ? 'text-[#b9351f]' : 'text-[#8a978f]'}`}
        >
          {formatVal(alertMin)}
        </span>
        <span
          className={`font-jetbrains-mono text-[10px] tabular-nums ${isInvalid ? 'text-[#b9351f]' : 'text-[#2f8a4a]'}`}
        >
          {formatVal(optimalMin)}
        </span>
        <span
          className={`font-jetbrains-mono text-[10px] tabular-nums ${isInvalid ? 'text-[#b9351f]' : 'text-[#2f8a4a]'}`}
        >
          {formatVal(optimalMax)}
        </span>
        <span
          className={`font-jetbrains-mono text-[10px] tabular-nums ${isInvalid ? 'text-[#b9351f]' : 'text-[#8a978f]'}`}
        >
          {formatVal(alertMax)}
        </span>
      </div>
    </div>
  )
}
