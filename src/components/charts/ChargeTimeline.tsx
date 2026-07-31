import type { ChargeTiming } from '../../domain/moves/analytics'

export function ChargeTimeline({ timing }: { timing: ChargeTiming }) {
  const cells = Array.from({ length: Math.max(1, timing.firstFastMoveCount) })
  return (
    <div className="min-w-36">
      <div className="mb-1 flex items-center justify-between text-[11px] text-[rgb(var(--muted-foreground))]">
        <span>{timing.chargedMoveName}</span>
        <span>{timing.firstTurns} turns</span>
      </div>
      <div className="grid h-3 gap-0.5" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(4px, 1fr))` }}>
        {cells.map((_, index) => (
          <span
            key={index}
            className="rounded-sm bg-[rgb(var(--primary)/0.72)]"
            title={`Fast move ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
