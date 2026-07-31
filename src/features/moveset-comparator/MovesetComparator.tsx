import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChargeTimeline } from '../../components/charts/ChargeTimeline'
import { Badge } from '../../components/ui/Badge'
import { Panel, PanelHeader } from '../../components/ui/Panel'
import type { ApplicationData } from '../../data/loaders'
import type { ChargedMove, FastMove } from '../../data/schemas/moves'
import { analyzeMoveset } from '../../domain/moves/analytics'
import { moveMaps } from '../shared/dataHelpers'
import { number } from '../shared/format'

export function MovesetComparator({ data }: { data: ApplicationData }) {
  const [speciesId, setSpeciesId] = useState(data.pokemon.candidates[0].id)
  const species = data.pokemon.candidates.find((candidate) => candidate.id === speciesId) ?? data.pokemon.candidates[0]
  const maps = useMemo(() => moveMaps(data), [data])
  const fastMoves = species.fastMoves.map((id) => maps.fast.get(id)).filter((move): move is FastMove => Boolean(move))
  const chargedMoves = species.chargedMoves
    .map((id) => maps.charged.get(id))
    .filter((move): move is ChargedMove => Boolean(move))
  const [fastAId, setFastAId] = useState(fastMoves[0]?.id)
  const [fastBId, setFastBId] = useState(fastMoves[1]?.id ?? fastMoves[0]?.id)
  const [chargedA1, setChargedA1] = useState(chargedMoves[0]?.id)
  const [chargedA2, setChargedA2] = useState(chargedMoves[1]?.id)
  const [chargedB1, setChargedB1] = useState(chargedMoves[0]?.id)
  const [chargedB2, setChargedB2] = useState(chargedMoves[1]?.id)

  function pickFast(id: string | undefined) {
    return fastMoves.find((move) => move.id === id) ?? fastMoves[0]
  }
  function pickCharged(id: string | undefined, fallback: number) {
    return chargedMoves.find((move) => move.id === id) ?? chargedMoves[fallback] ?? chargedMoves[0]
  }

  const buildA = {
    fast: pickFast(fastAId),
    charged: [pickCharged(chargedA1, 0), pickCharged(chargedA2, 1)] as [ChargedMove, ChargedMove],
  }
  const buildB = {
    fast: pickFast(fastBId),
    charged: [pickCharged(chargedB1, 0), pickCharged(chargedB2, 1)] as [ChargedMove, ChargedMove],
  }
  const analyticsA = analyzeMoveset(species, buildA.fast, buildA.charged)
  const analyticsB = analyzeMoveset(species, buildB.fast, buildB.charged)
  const chartRows = [
    { name: 'A DPT', value: analyticsA.fast.damagePerTurn },
    { name: 'A EPT', value: analyticsA.fast.energyPerTurn },
    { name: 'B DPT', value: analyticsB.fast.damagePerTurn },
    { name: 'B EPT', value: analyticsB.fast.energyPerTurn },
  ]

  return (
    <div className="grid gap-4">
      <Panel>
        <PanelHeader title="Moveset Comparator" subtitle="Compare legal fast moves and dual Charged Attack combinations." />
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Pokemon" value={species.id} onChange={setSpeciesId} options={data.pokemon.candidates.map((candidate) => [candidate.id, candidate.name])} />
          <Select label="Build A fast" value={buildA.fast.id} onChange={setFastAId} options={fastMoves.map((move) => [move.id, move.name])} />
          <Select label="Build B fast" value={buildB.fast.id} onChange={setFastBId} options={fastMoves.map((move) => [move.id, move.name])} />
          <div className="flex items-end"><Badge tone="warning">Trainer Battle moves only</Badge></div>
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-[1fr_340px_1fr]">
        <BuildPanel label="Build A" speciesTypes={species.types} fastMove={buildA.fast} chargedMoves={buildA.charged} analytics={analyticsA} chargedOptions={chargedMoves} setChargedOne={setChargedA1} setChargedTwo={setChargedA2} />
        <Panel className="p-3">
          <h3 className="text-sm font-semibold">Fast move efficiency</h3>
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows} margin={{ left: -24, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => number(Number(value))} />
                <Bar dataKey="value" fill="rgb(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <BuildPanel label="Build B" speciesTypes={species.types} fastMove={buildB.fast} chargedMoves={buildB.charged} analytics={analyticsB} chargedOptions={chargedMoves} setChargedOne={setChargedB1} setChargedTwo={setChargedB2} />
      </div>
    </div>
  )
}

function BuildPanel({
  label,
  fastMove,
  chargedMoves,
  analytics,
  chargedOptions,
  setChargedOne,
  setChargedTwo,
}: {
  label: string
  speciesTypes: string[]
  fastMove: FastMove
  chargedMoves: [ChargedMove, ChargedMove]
  analytics: ReturnType<typeof analyzeMoveset>
  chargedOptions: ChargedMove[]
  setChargedOne: (id: string) => void
  setChargedTwo: (id: string) => void
}) {
  return (
    <Panel>
      <PanelHeader title={label} subtitle={`${fastMove.name}: ${number(analytics.fast.damagePerTurn)} DPT / ${number(analytics.fast.energyPerTurn)} EPT`} />
      <div className="grid gap-3 p-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <Select label="Charged 1" value={chargedMoves[0].id} onChange={setChargedOne} options={chargedOptions.map((move) => [move.id, `${move.name} (${move.energyCost})`])} />
          <Select label="Charged 2" value={chargedMoves[1].id} onChange={setChargedTwo} options={chargedOptions.map((move) => [move.id, `${move.name} (${move.energyCost})`])} />
        </div>
        {analytics.timings.map((timing) => (
          <div key={timing.chargedMoveId} className="rounded border border-[rgb(var(--border))] p-3">
            <ChargeTimeline timing={timing} />
            <p className="mt-2 text-xs text-[rgb(var(--muted-foreground))]">
              First use after {timing.firstFastMoveCount} fast moves ({number(timing.firstSeconds)}s turn time). Repeat interval: {timing.repeatFastMoveCount} fast moves with {timing.leftoverEnergyAfterFirst} leftover energy after first use.
            </p>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<[string, string]>
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-[rgb(var(--muted-foreground))]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel))] px-2 text-sm text-[rgb(var(--foreground))]"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}
