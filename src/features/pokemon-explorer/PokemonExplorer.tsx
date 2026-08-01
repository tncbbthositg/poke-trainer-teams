import { Fragment, useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown, ChevronRight, GitCompare } from 'lucide-react'
import { Badge } from '../../components/atoms/Badge'
import { TypeChipList } from '../../components/atoms/TypeChip'
import { DataSelect } from '../../components/molecules/DataSelect'
import { Panel, PanelHeader } from '../../components/molecules/Panel'
import type { ApplicationData } from '../../data/loaders'
import type { PokemonType } from '../../data/schemas/pokemon'
import {
  hasScarceCandyAccess,
  hasRocketReliabilityWarning,
  pokemonFocusStrategyLabels,
  pokemonFocusStrategyNotes,
  rankPokemonForFocus,
  type PokemonFocusStrategy,
} from '../../domain/ranking/pokemonFocus'
import { calculateEffectiveStats } from '../../domain/stats/effectiveStats'
import { stabMultiplier } from '../../domain/types/effectiveness'
import { typeColor } from '../../domain/types/typeColors'
import { integer, number } from '../../lib/format'

type ExplorerRow = {
  id: string
  rank: number
  name: string
  types: PokemonType[]
  score: number
  cp: number
  attack: number
  defense: number
  hp: number
  bulk: number
  fastMoveId: string
  fastMove: string
  fastMoveType: PokemonType
  chargedOneId: string
  chargedOne: string
  chargedOneType: PokemonType
  chargedOneCost: number
  chargedOneDpe: number
  chargedTwoId: string
  chargedTwo: string
  chargedTwoType: PokemonType
  chargedTwoCost: number
  chargedTwoDpe: number
  dpt: number
  ept: number
  firstChargeTurns: number
  repeatChargeTurns: number
  neutralOutputPerTurn: number
  scarceCandy: boolean
  rocketReliabilityWarning: boolean
  reason: string
  confidence: string
}

export function PokemonExplorer({ data }: { data: ApplicationData }) {
  const initialControls = useMemo(() => readPersistedControls(), [])
  const [filter, setFilter] = useState(initialControls.filter)
  const [strategy, setStrategy] = useState<PokemonFocusStrategy>(initialControls.strategy)
  const [hideScarceCandy, setHideScarceCandy] = useState(initialControls.hideScarceCandy)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    persistControls({ filter, strategy, hideScarceCandy })
  }, [filter, hideScarceCandy, strategy])

  const rows = useMemo<ExplorerRow[]>(
    () => {
      const rankings = rankPokemonForFocus(data.pokemon.candidates, data.moves, strategy, 40)

      return rankings
        .map((ranking) => {
          const { species, moveset } = ranking
          const stats = calculateEffectiveStats(species, 40)
          return {
            id: species.id,
            rank: ranking.rank,
            name: species.name,
            types: species.types,
            score: ranking.score,
            cp: stats.cp,
            attack: stats.attack,
            defense: stats.defense,
            hp: stats.hp,
            bulk: stats.rawBulkProxy,
            fastMoveId: moveset.fastMove.id,
            fastMove: moveset.fastMove.name,
            fastMoveType: moveset.fastMove.type,
            chargedOneId: moveset.chargedMoves[0].id,
            chargedOne: moveset.chargedMoves[0].name,
            chargedOneType: moveset.chargedMoves[0].type,
            chargedOneCost: moveset.chargedMoves[0].energyCost,
            chargedOneDpe: chargedDpe(species.types, moveset.chargedMoves[0]),
            chargedTwoId: moveset.chargedMoves[1].id,
            chargedTwo: moveset.chargedMoves[1].name,
            chargedTwoType: moveset.chargedMoves[1].type,
            chargedTwoCost: moveset.chargedMoves[1].energyCost,
            chargedTwoDpe: chargedDpe(species.types, moveset.chargedMoves[1]),
            dpt: moveset.fastDamagePerTurn,
            ept: moveset.fastEnergyPerTurn,
            firstChargeTurns: moveset.firstChargeTurns,
            repeatChargeTurns: moveset.repeatChargeTurns,
            neutralOutputPerTurn: moveset.neutralOutputPerTurn,
            scarceCandy: hasScarceCandyAccess(species),
            rocketReliabilityWarning: hasRocketReliabilityWarning(species),
            reason: ranking.reason,
            confidence: species.provenance.category,
          }
        })
        .filter((row) => !hideScarceCandy || !row.scarceCandy)
    },
    [data, hideScarceCandy, strategy],
  )
  const hiddenScarceCandyCount = useMemo(
    () =>
      hideScarceCandy
        ? data.pokemon.candidates.filter((species) => hasScarceCandyAccess(species)).length
        : 0,
    [data.pokemon.candidates, hideScarceCandy],
  )

  const columns = useMemo<ColumnDef<ExplorerRow>[]>(
    () => [
      {
        id: 'expand',
        header: '',
        cell: (info) => {
          const isExpanded = expandedIds.has(info.row.original.id)

          return (
            <button
              type="button"
              onClick={() => toggleExpanded(info.row.original.id)}
              className="grid h-7 w-7 place-items-center rounded-md text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${info.row.original.name}`}
              aria-expanded={isExpanded}
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                aria-hidden
              />
            </button>
          )
        },
      },
      {
        id: 'moveset-link',
        header: '',
        cell: (info) => (
          <a
            href={movesetHref(info.row.original, strategy)}
            className="grid h-7 w-7 place-items-center rounded-md text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
            aria-label={`Compare ${info.row.original.name} moveset`}
            title="Compare moveset"
          >
            <GitCompare className="h-4 w-4" aria-hidden />
          </a>
        ),
      },
      { accessorKey: 'rank', header: sortableHeader('Rank'), cell: (info) => integer(info.getValue<number>()) },
      {
        accessorKey: 'name',
        header: 'Pokemon',
        cell: (info) => (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span>{info.getValue<string>()}</span>
            {info.row.original.rocketReliabilityWarning ? (
              <Badge tone="warning">Rocket risk</Badge>
            ) : null}
          </span>
        ),
      },
      {
        accessorKey: 'types',
        header: 'Types',
        cell: (info) => <TypeChipList types={info.getValue<PokemonType[]>()} compact abbreviated />,
        filterFn: (row, columnId, filterValue) =>
          row.getValue<PokemonType[]>(columnId).some((type) =>
            type.toLowerCase().includes(String(filterValue).toLowerCase()),
          ),
      },
      { accessorKey: 'score', header: sortableHeader('Focus score'), cell: (info) => number(info.getValue<number>()) },
      {
        accessorKey: 'fastMove',
        header: () => <FastMoveHeader />,
        cell: (info) => (
          <MoveChip
            type={info.row.original.fastMoveType}
            name={info.getValue<string>()}
            metric={`${number(info.row.original.dpt)}/${number(info.row.original.ept)}`}
          />
        ),
      },
      {
        accessorKey: 'chargedOne',
        header: () => <ChargedHeader label="Charged 1" />,
        cell: (info) => <ChargedMoveCell row={info.row.original} slot="one" />,
      },
      {
        accessorKey: 'chargedTwo',
        header: () => <ChargedHeader label="Charged 2" />,
        cell: (info) => <ChargedMoveCell row={info.row.original} slot="two" />,
      },
    ],
    [expandedIds, strategy],
  )

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter: filter },
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Panel>
      <PanelHeader
        title="Pokemon Explorer"
        subtitle={`Level 40, 15/15/15 heuristic focus ranking. ${pokemonFocusStrategyNotes[strategy]}`}
        right={
          <div className="grid gap-2 sm:grid-cols-[190px_160px_170px]">
            <DataSelect
              label="Strategy"
              value={strategy}
              onChange={(value) => setStrategy(value as PokemonFocusStrategy)}
              options={Object.entries(pokemonFocusStrategyLabels).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <label className="grid gap-1 text-xs font-medium text-[rgb(var(--muted-foreground))]">
              Filter
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Pokemon or type"
                className="h-9 w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel))] px-3 text-sm"
                aria-label="Filter Pokemon table"
              />
            </label>
            <label className="flex h-full min-h-[52px] items-end gap-2 px-1 py-2 text-xs font-medium text-[rgb(var(--foreground))]">
              <input
                type="checkbox"
                checked={hideScarceCandy}
                onChange={(event) => setHideScarceCandy(event.target.checked)}
                className="mb-0.5 h-4 w-4 accent-[rgb(var(--primary))]"
              />
              Hide scarce candy
            </label>
          </div>
        }
      />
      <div className="border-t border-[rgb(var(--border))] px-3 py-2 text-xs text-[rgb(var(--muted-foreground))]">
        <Badge tone="warning">Heuristic</Badge>
        <span className="ml-2">
          This ranking recommends which Pokemon and movesets to focus on before Rocket win/loss
          simulation is available.
        </span>
        {hiddenScarceCandyCount > 0 ? (
          <span className="ml-2">
            Hiding {integer(hiddenScarceCandyCount)} legendary, mythical, Ultra Beast, or raid-candy
            competition candidates.
          </span>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-[rgb(var(--muted)/0.55)] text-xs text-[rgb(var(--muted-foreground))]">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 font-semibold">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => {
              const isExpanded = expandedIds.has(row.original.id)

              return (
                <Fragment key={row.id}>
                  <tr key={row.id} className="border-t border-[rgb(var(--border))]">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {isExpanded ? (
                    <tr key={`${row.id}-details`} className="border-t border-[rgb(var(--border))] bg-[rgb(var(--muted)/0.35)]">
                      <td colSpan={columns.length} className="px-3 py-2">
                        <ExpandedDetails row={row.original} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function ChargedMoveCell({ row, slot }: { row: ExplorerRow; slot: 'one' | 'two' }) {
  const move =
    slot === 'one'
      ? {
          name: row.chargedOne,
          type: row.chargedOneType,
          cost: row.chargedOneCost,
          dpe: row.chargedOneDpe,
        }
      : {
          name: row.chargedTwo,
          type: row.chargedTwoType,
          cost: row.chargedTwoCost,
          dpe: row.chargedTwoDpe,
        }

  return (
    <MoveChip
      type={move.type}
      name={move.name}
      metric={`${integer(move.cost)}/${number(move.dpe)}`}
    />
  )
}

function MoveChip({ type, name, metric }: { type: PokemonType; name: string; metric?: string }) {
  const color = typeColor(type)

  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span
        className="inline-flex shrink-0 items-center truncate rounded px-2.5 py-0.5 text-[11px] font-semibold"
        style={{ backgroundColor: color.bg, color: color.text }}
        title={type}
      >
        <span className="truncate">{name}</span>
      </span>
      {metric ? (
        <span className="shrink-0 text-xs font-semibold text-[rgb(var(--muted-foreground))]">
          {metric}
        </span>
      ) : null}
    </span>
  )
}

function FastMoveHeader() {
  return (
    <span>
      Fast move <span className="font-normal text-[rgb(var(--muted-foreground))]">(dpt/ept)</span>
    </span>
  )
}

function ChargedHeader({ label }: { label: string }) {
  return (
    <span>
      {label} <span className="font-normal text-[rgb(var(--muted-foreground))]">(cost/dpe)</span>
    </span>
  )
}

function ExpandedDetails({ row }: { row: ExplorerRow }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-[rgb(var(--muted-foreground))] sm:grid-cols-4 xl:grid-cols-[80px_210px_110px_110px_110px_145px_90px_minmax(260px,1fr)]">
      <Detail label="CP" value={integer(row.cp)} />
      <Detail label="Atk / Def / HP" value={`${number(row.attack)} / ${number(row.defense)} / ${integer(row.hp)}`} />
      <Detail label="Bulk proxy" value={integer(row.bulk)} />
      <Detail label="First charge" value={`${integer(row.firstChargeTurns)} turns`} />
      <Detail label="Repeat charge" value={`${integer(row.repeatChargeTurns)} turns`} />
      <Detail label="Neutral output" value={`${number(row.neutralOutputPerTurn)} per turn`} />
      <Detail label="Confidence" value={row.confidence} />
      <Detail label="Heuristic read" value={row.reason} className="col-span-2 sm:col-span-4 xl:col-span-1" />
      {row.rocketReliabilityWarning ? (
        <Detail
          label="Rocket warning"
          value="Field report says this shortcut failed; form-changing Aura Wheel and low bulk are not validated for Rocket reliability."
          className="col-span-2 sm:col-span-4 xl:col-span-8"
        />
      ) : null}
    </div>
  )
}

function movesetHref(row: ExplorerRow, strategy: PokemonFocusStrategy) {
  const params = new URLSearchParams({
    pokemon: row.id,
    strategy,
    fastA: row.fastMoveId,
    chargedA1: row.chargedOneId,
    chargedA2: row.chargedTwoId,
  })

  return `#/movesets?${params.toString()}`
}

type PersistedExplorerControls = {
  filter: string
  strategy: PokemonFocusStrategy
  hideScarceCandy: boolean
}

const explorerControlsStorageKey = 'rocket-pair-lab:pokemon-explorer-controls'
const defaultExplorerControls: PersistedExplorerControls = {
  filter: '',
  strategy: 'fastest-victory',
  hideScarceCandy: true,
}

function readPersistedControls(): PersistedExplorerControls {
  try {
    const persisted = window.sessionStorage.getItem(explorerControlsStorageKey)
    if (!persisted) {
      return defaultExplorerControls
    }

    const parsed = JSON.parse(persisted) as Partial<PersistedExplorerControls>

    return {
      filter: typeof parsed.filter === 'string' ? parsed.filter : defaultExplorerControls.filter,
      strategy: isPokemonFocusStrategy(parsed.strategy)
        ? parsed.strategy
        : defaultExplorerControls.strategy,
      hideScarceCandy:
        typeof parsed.hideScarceCandy === 'boolean'
          ? parsed.hideScarceCandy
          : defaultExplorerControls.hideScarceCandy,
    }
  } catch {
    return defaultExplorerControls
  }
}

function persistControls(controls: PersistedExplorerControls) {
  try {
    window.sessionStorage.setItem(explorerControlsStorageKey, JSON.stringify(controls))
  } catch {
    // Browser storage can be unavailable in private or locked-down contexts.
  }
}

function isPokemonFocusStrategy(value: unknown): value is PokemonFocusStrategy {
  return typeof value === 'string' && value in pokemonFocusStrategyLabels
}

function Detail({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={`grid min-w-0 content-start gap-0.5 ${className}`}>
      <span className="font-medium text-[rgb(var(--foreground))]">{label}</span>
      <span className="min-w-0 leading-5">{value}</span>
    </div>
  )
}

function chargedDpe(
  speciesTypes: PokemonType[],
  chargedMove: { type: PokemonType; power: number; energyCost: number },
) {
  return (chargedMove.power * stabMultiplier(chargedMove.type, speciesTypes)) / chargedMove.energyCost
}

function sortableHeader(label: string) {
  return ({ column }: { column: { toggleSorting: () => void } }) => (
    <button type="button" onClick={() => column.toggleSorting()} className="inline-flex items-center gap-1">
      {label}
      <ArrowUpDown className="h-3 w-3" aria-hidden />
    </button>
  )
}
