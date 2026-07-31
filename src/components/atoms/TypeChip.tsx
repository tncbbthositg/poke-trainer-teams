import type { PokemonType } from '../../data/schemas/pokemon'
import { typeColor } from '../../domain/types/typeColors'
import { cn } from '../../lib/utils'
import { typeLabel } from './typeLabels'

type TypeChipProps = {
  type: PokemonType
  label?: string
  className?: string
  compact?: boolean
}

export function TypeChip({ type, label = typeLabel(type), className, compact = false }: TypeChipProps) {
  const color = typeColor(type)

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded font-semibold',
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-2 py-1 text-xs',
        label === typeLabel(type) && 'uppercase',
        className,
      )}
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {label}
    </span>
  )
}

export function TypeChipList({
  types,
  compact = false,
  className,
}: {
  types: PokemonType[]
  compact?: boolean
  className?: string
}) {
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      {types.map((type) => (
        <TypeChip key={type} type={type} compact={compact} />
      ))}
    </span>
  )
}
