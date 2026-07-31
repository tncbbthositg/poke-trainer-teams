import type { PokemonType } from '../../data/schemas/pokemon'
import { typeColor } from '../../domain/types/typeColors'
import { cn } from '../../lib/utils'
import { typeAbbreviation, typeLabel } from './typeLabels'

type TypeChipProps = {
  type: PokemonType
  label?: string
  className?: string
  compact?: boolean
}

export function TypeChip({ type, label, className, compact = false }: TypeChipProps) {
  const color = typeColor(type)
  const displayLabel = label ?? typeLabel(type)

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded font-semibold',
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2 py-1 text-xs',
        !label && 'uppercase',
        className,
      )}
      style={{ backgroundColor: color.bg, color: color.text }}
      title={typeLabel(type)}
    >
      {displayLabel}
    </span>
  )
}

export function TypeChipList({
  types,
  abbreviated = false,
  compact = false,
  className,
}: {
  types: PokemonType[]
  abbreviated?: boolean
  compact?: boolean
  className?: string
}) {
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      {types.map((type) => (
        <TypeChip
          key={type}
          type={type}
          label={abbreviated ? typeAbbreviation(type) : undefined}
          compact={compact}
        />
      ))}
    </span>
  )
}
