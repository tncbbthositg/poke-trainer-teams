import { TypeChip } from '../../atoms/TypeChip'
import type { ChargeTiming } from '../../../domain/moves/analytics'
import { typeColor } from '../../../domain/types/typeColors'
import { number } from '../../../lib/format'

export function ChargeTimeline({
  timing,
  maxTurns,
}: {
  timing: ChargeTiming
  maxTurns: number
}) {
  const scaleTurns = Math.max(maxTurns, timing.firstTurns, 1)
  const fillPercent = (timing.firstTurns / scaleTurns) * 100
  const midpointSeconds = scaleTurns * 0.25
  const maxSeconds = scaleTurns * 0.5
  const color = typeColor(timing.chargedMoveType)
  const segments = Array.from({ length: Math.max(1, timing.firstFastMoveCount) })
  const segmentWidth = 100 / segments.length

  return (
    <div className="min-w-36">
      <div className="mb-1 flex items-center justify-between text-[11px] text-[rgb(var(--muted-foreground))]">
        <span className="inline-flex items-center gap-1">
          <TypeChip type={timing.chargedMoveType} compact />
          {timing.chargedMoveName}
        </span>
        <span>
          {timing.firstTurns} turns / {number(timing.firstSeconds)}s
        </span>
      </div>
      <div className="relative h-4 overflow-hidden rounded-sm bg-[rgb(var(--muted)/0.72)]">
        <div className="flex h-4 gap-0.5" style={{ width: `${fillPercent}%` }}>
          {segments.map((_, index) => (
            <span
              key={index}
              className="h-4 first:rounded-l-sm last:rounded-r-sm"
              style={{
                width: `${segmentWidth}%`,
                backgroundColor: color.bar,
              }}
              title={`Fast move ${index + 1} of ${timing.firstFastMoveCount}`}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-[rgb(var(--foreground)/0.26)]" />
      </div>
      <div className="mt-1 grid grid-cols-3 text-[10px] text-[rgb(var(--muted-foreground))]">
        <span>0s</span>
        <span className="text-center">{number(midpointSeconds)}s</span>
        <span className="text-right">{number(maxSeconds)}s</span>
      </div>
    </div>
  )
}
