import { number } from '../../lib/format'

export function MetricBar({
  label,
  value,
  max,
  color,
  digits = 1,
}: {
  label: string
  value: number
  max: number
  color: string
  digits?: number
}) {
  const width = `${Math.max(4, (value / max) * 100)}%`

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span>{label}</span>
        <span className="font-semibold">{number(value, digits)}</span>
      </div>
      <div className="h-3 rounded-sm bg-[rgb(var(--muted)/0.72)]">
        <div
          className="h-3 rounded-sm"
          style={{ width, backgroundColor: color }}
          role="img"
          aria-label={`${label}: ${number(value, digits)}`}
        />
      </div>
    </div>
  )
}
