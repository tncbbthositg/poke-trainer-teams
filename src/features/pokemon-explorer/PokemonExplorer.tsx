import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { Badge } from '../../components/atoms/Badge'
import { TypeChip, TypeChipList } from '../../components/atoms/TypeChip'
import { Panel, PanelHeader } from '../../components/molecules/Panel'
import type { ApplicationData } from '../../data/loaders'
import type { PokemonType } from '../../data/schemas/pokemon'
import { analyzeMoveset } from '../../domain/moves/analytics'
import { calculateEffectiveStats } from '../../domain/stats/effectiveStats'
import { integer, number } from '../../lib/format'
import { firstLegalMoves } from '../shared/dataHelpers'

type ExplorerRow = {
  id: string
  name: string
  types: PokemonType[]
  cp: number
  attack: number
  defense: number
  hp: number
  bulk: number
  fastMove: string
  fastMoveType: PokemonType
  dpt: number
  ept: number
  cheapestCharged: string
  cheapestChargedType: PokemonType
  cheapestCost: number
  firstChargeTurns: number
  confidence: string
}

export function PokemonExplorer({ data }: { data: ApplicationData }) {
  const [filter, setFilter] = useState('')
  const rows = useMemo<ExplorerRow[]>(
    () =>
      data.pokemon.candidates.map((species) => {
        const stats = calculateEffectiveStats(species, 40)
        const moves = firstLegalMoves(species, data)
        const analytics = analyzeMoveset(species, moves.fastMove, moves.chargedMoves)
        const charged = moves.chargedMoves
          .slice()
          .sort((a, b) => a.energyCost - b.energyCost)[0]
        const timing = analytics.timings.find((item) => item.chargedMoveId === charged.id)
        return {
          id: species.id,
          name: species.name,
          types: species.types,
          cp: stats.cp,
          attack: stats.attack,
          defense: stats.defense,
          hp: stats.hp,
          bulk: stats.rawBulkProxy,
          fastMove: moves.fastMove.name,
          fastMoveType: moves.fastMove.type,
          dpt: analytics.fast.damagePerTurn,
          ept: analytics.fast.energyPerTurn,
          cheapestCharged: charged.name,
          cheapestChargedType: charged.type,
          cheapestCost: charged.energyCost,
          firstChargeTurns: timing?.firstTurns ?? 0,
          confidence: species.provenance.category,
        }
      }),
    [data],
  )

  const columns = useMemo<ColumnDef<ExplorerRow>[]>(
    () => [
      { accessorKey: 'name', header: 'Pokemon' },
      {
        accessorKey: 'types',
        header: 'Types',
        cell: (info) => <TypeChipList types={info.getValue<PokemonType[]>()} compact />,
        filterFn: (row, columnId, filterValue) =>
          row.getValue<PokemonType[]>(columnId).some((type) =>
            type.toLowerCase().includes(String(filterValue).toLowerCase()),
          ),
      },
      { accessorKey: 'cp', header: sortableHeader('CP'), cell: (info) => integer(info.getValue<number>()) },
      { accessorKey: 'attack', header: sortableHeader('Atk'), cell: (info) => number(info.getValue<number>()) },
      { accessorKey: 'defense', header: sortableHeader('Def'), cell: (info) => number(info.getValue<number>()) },
      { accessorKey: 'hp', header: sortableHeader('HP'), cell: (info) => integer(info.getValue<number>()) },
      { accessorKey: 'bulk', header: sortableHeader('Bulk proxy'), cell: (info) => integer(info.getValue<number>()) },
      {
        accessorKey: 'fastMove',
        header: 'Fast move',
        cell: (info) => (
          <span className="inline-flex items-center gap-2">
            <TypeChip type={info.row.original.fastMoveType} compact />
            {info.getValue<string>()}
          </span>
        ),
      },
      { accessorKey: 'dpt', header: sortableHeader('DPT'), cell: (info) => number(info.getValue<number>()) },
      { accessorKey: 'ept', header: sortableHeader('EPT'), cell: (info) => number(info.getValue<number>()) },
      {
        accessorKey: 'cheapestCharged',
        header: 'Cheapest charged',
        cell: (info) => (
          <span className="inline-flex items-center gap-2">
            <TypeChip type={info.row.original.cheapestChargedType} compact />
            {info.getValue<string>()}
          </span>
        ),
      },
      { accessorKey: 'cheapestCost', header: sortableHeader('Cost') },
      { accessorKey: 'firstChargeTurns', header: sortableHeader('First charge') },
      { accessorKey: 'confidence', header: 'Confidence', cell: (info) => <Badge tone="info">{info.getValue<string>()}</Badge> },
    ],
    [],
  )

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
        subtitle="Level 40, 15/15/15 attacker calculations using legal Trainer Battle moves."
        right={
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter"
            className="h-9 w-40 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel))] px-3 text-sm"
            aria-label="Filter Pokemon table"
          />
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
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
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-[rgb(var(--border))]">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}

function sortableHeader(label: string) {
  return ({ column }: { column: { toggleSorting: () => void } }) => (
    <button type="button" onClick={() => column.toggleSorting()} className="inline-flex items-center gap-1">
      {label}
      <ArrowUpDown className="h-3 w-3" aria-hidden />
    </button>
  )
}
