import type { PokemonType } from '../../data/schemas/pokemon'
import { typeColor } from '../../domain/types/typeColors'

export type DataSelectOption = {
  value: string
  label: string
  type?: PokemonType
}

export function DataSelect({
  label,
  value,
  selectedType,
  onChange,
  options,
}: {
  label: string
  value: string
  selectedType?: PokemonType
  onChange: (value: string) => void
  options: DataSelectOption[]
}) {
  const selectedColor = selectedType ? typeColor(selectedType) : undefined

  return (
    <label className="grid min-w-0 gap-1 text-xs font-medium text-[rgb(var(--muted-foreground))]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 min-w-0 truncate rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel))] py-0 pl-2 pr-10 text-xs text-[rgb(var(--foreground))]"
        style={
          selectedColor
            ? {
                borderLeftColor: selectedColor.bg,
                borderLeftWidth: 6,
              }
            : undefined
        }
      >
        {options.map((option) => {
          const color = option.type ? typeColor(option.type) : undefined

          return (
            <option
              key={option.value}
              value={option.value}
              style={
                color
                  ? {
                      backgroundColor: color.bg,
                      color: color.text,
                    }
                  : undefined
              }
            >
              {option.label}
            </option>
          )
        })}
      </select>
    </label>
  )
}
