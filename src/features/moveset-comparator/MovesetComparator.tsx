import { useEffect, useMemo, useState } from 'react'
import { Badge } from '../../components/atoms/Badge'
import { MetricBar } from '../../components/atoms/MetricBar'
import { TypeChip } from '../../components/atoms/TypeChip'
import { typeAbbreviation } from '../../components/atoms/typeLabels'
import { ChargeTimeline } from '../../components/molecules/charts/ChargeTimeline'
import { DataSelect } from '../../components/molecules/DataSelect'
import { Panel, PanelHeader } from '../../components/molecules/Panel'
import type { ApplicationData } from '../../data/loaders'
import type { ChargedMove, FastMove } from '../../data/schemas/moves'
import type { PokemonSpecies } from '../../data/schemas/pokemon'
import { analyzeMoveset, type OutputTimelineEvent } from '../../domain/moves/analytics'
import {
  bestMovesetForStrategy,
  type PokemonFocusStrategy,
} from '../../domain/ranking/pokemonFocus'
import { typeColor } from '../../domain/types/typeColors'
import { number } from '../../lib/format'
import { moveMaps } from '../shared/dataHelpers'

type MovesetParams = {
  speciesId: string
  strategy?: PokemonFocusStrategy
  fastAId?: string
  chargedA1Id?: string
  chargedA2Id?: string
}

type MovesetIds = {
  fastId: string
  chargedOneId: string
  chargedTwoId: string
}

export function MovesetComparator({ data }: { data: ApplicationData }) {
  const maps = useMemo(() => moveMaps(data), [data])
  const initialParams = initialMovesetParams(data)
  const initialSpecies =
    data.pokemon.candidates.find((candidate) => candidate.id === initialParams.speciesId) ??
    data.pokemon.candidates[0]
  const initialBuilds = initialComparatorBuilds(data, initialSpecies, initialParams)
  const [speciesId, setSpeciesId] = useState(initialSpecies.id)
  const species = data.pokemon.candidates.find((candidate) => candidate.id === speciesId) ?? data.pokemon.candidates[0]
  const fastMoves = species.fastMoves.map((id) => maps.fast.get(id)).filter((move): move is FastMove => Boolean(move))
  const chargedMoves = species.chargedMoves
    .map((id) => maps.charged.get(id))
    .filter((move): move is ChargedMove => Boolean(move))
  const [fastAId, setFastAId] = useState(initialBuilds.a.fastId)
  const [fastBId, setFastBId] = useState(initialBuilds.b.fastId)
  const [chargedA1, setChargedA1] = useState(initialBuilds.a.chargedOneId)
  const [chargedA2, setChargedA2] = useState(initialBuilds.a.chargedTwoId)
  const [chargedB1, setChargedB1] = useState(initialBuilds.b.chargedOneId)
  const [chargedB2, setChargedB2] = useState(initialBuilds.b.chargedTwoId)

  useEffect(() => {
    function applyLinkedMoveset() {
      const params = initialMovesetParams(data)
      const linkedSpecies = data.pokemon.candidates.find(
        (candidate) => candidate.id === params.speciesId,
      )
      if (!linkedSpecies) {
        return
      }
      const linkedFastMoves = linkedSpecies.fastMoves
      const linkedChargedMoves = linkedSpecies.chargedMoves
      const linkedBuilds = initialComparatorBuilds(data, linkedSpecies, params)

      setSpeciesId(linkedSpecies.id)
      setFastAId(
        params.fastAId && linkedFastMoves.includes(params.fastAId)
          ? params.fastAId
          : linkedBuilds.a.fastId,
      )
      setChargedA1(
        params.chargedA1Id && linkedChargedMoves.includes(params.chargedA1Id)
          ? params.chargedA1Id
          : linkedBuilds.a.chargedOneId,
      )
      setChargedA2(
        params.chargedA2Id && linkedChargedMoves.includes(params.chargedA2Id)
          ? params.chargedA2Id
          : linkedBuilds.a.chargedTwoId,
      )
      setFastBId(linkedBuilds.b.fastId)
      setChargedB1(linkedBuilds.b.chargedOneId)
      setChargedB2(linkedBuilds.b.chargedTwoId)
    }

    window.addEventListener('hashchange', applyLinkedMoveset)
    applyLinkedMoveset()
    return () => window.removeEventListener('hashchange', applyLinkedMoveset)
  }, [data])

  function setSpecies(nextSpeciesId: string) {
    const nextSpecies =
      data.pokemon.candidates.find((candidate) => candidate.id === nextSpeciesId) ??
      data.pokemon.candidates[0]
    const nextBuilds = initialComparatorBuilds(data, nextSpecies, {
      speciesId: nextSpecies.id,
      strategy: 'fastest-victory',
    })
    setSpeciesId(nextSpecies.id)
    setFastAId(nextBuilds.a.fastId)
    setFastBId(nextBuilds.b.fastId)
    setChargedA1(nextBuilds.a.chargedOneId)
    setChargedA2(nextBuilds.a.chargedTwoId)
    setChargedB1(nextBuilds.b.chargedOneId)
    setChargedB2(nextBuilds.b.chargedTwoId)
  }

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
  const maxTimelineTurns = Math.max(
    ...analyticsA.timings.map((timing) => timing.firstTurns),
    ...analyticsB.timings.map((timing) => timing.firstTurns),
    1,
  )
  const bestOutputA = Math.max(...analyticsA.neutralOutput.map((output) => output.totalPower))
  const bestOutputB = Math.max(...analyticsB.neutralOutput.map((output) => output.totalPower))
  const bestOutputIndexA = analyticsA.neutralOutput.findIndex(
    (output) => output.totalPower === bestOutputA,
  )
  const bestOutputIndexB = analyticsB.neutralOutput.findIndex(
    (output) => output.totalPower === bestOutputB,
  )
  const fastChartRows = [
    { name: 'A DPT', value: analyticsA.fast.damagePerTurn },
    { name: 'A EPT', value: analyticsA.fast.energyPerTurn },
    { name: 'B DPT', value: analyticsB.fast.damagePerTurn },
    { name: 'B EPT', value: analyticsB.fast.energyPerTurn },
  ]
  const maxFastMetric = Math.max(...fastChartRows.map((row) => row.value), 1)
  const fastestChargeA = Math.min(...analyticsA.timings.map((timing) => timing.firstSeconds))
  const fastestChargeB = Math.min(...analyticsB.timings.map((timing) => timing.firstSeconds))

  return (
    <div className="grid gap-4">
      <Panel>
        <PanelHeader title="Moveset Comparator" subtitle="Compare legal fast moves and dual Charged Attack combinations." />
        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
          <DataSelect label="Pokemon" value={species.id} onChange={setSpecies} options={[...data.pokemon.candidates].sort((a, b) => a.name.localeCompare(b.name)).map((candidate) => ({ value: candidate.id, label: candidate.name }))} />
          <DataSelect label="Build A fast" value={buildA.fast.id} selectedType={buildA.fast.type} onChange={setFastAId} options={fastMoves.map((move) => ({ value: move.id, label: fastMoveLabel(move), type: move.type }))} />
          <DataSelect label="Build B fast" value={buildB.fast.id} selectedType={buildB.fast.type} onChange={setFastBId} options={fastMoves.map((move) => ({ value: move.id, label: fastMoveLabel(move), type: move.type }))} />
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-3">
        <BuildPanel label="Build A" speciesTypes={species.types} fastMove={buildA.fast} chargedMoves={buildA.charged} analytics={analyticsA} chargedOptions={chargedMoves} maxTimelineTurns={maxTimelineTurns} setChargedOne={setChargedA1} setChargedTwo={setChargedA2} />
        <Panel className="p-3">
          <h3 className="text-sm font-semibold">Build comparison</h3>
          <div className="mt-2 divide-y divide-[rgb(var(--border)/0.65)] text-xs">
            <ComparisonLine
              label="Fastest first charge"
              a={`${number(fastestChargeA)}s`}
              b={`${number(fastestChargeB)}s`}
              winner={fastestChargeA === fastestChargeB ? 'tie' : fastestChargeA < fastestChargeB ? 'A' : 'B'}
            />
            <ComparisonLine
              label="STAB-adjusted 100T output"
              a={number(bestOutputA, 0)}
              b={number(bestOutputB, 0)}
              winner={bestOutputA === bestOutputB ? 'tie' : bestOutputA > bestOutputB ? 'A' : 'B'}
            />
          </div>
          <h4 className="mt-4 text-xs font-semibold uppercase text-[rgb(var(--muted-foreground))]">
            Fast move pressure
          </h4>
          <div className="mt-2 grid gap-2">
            {fastChartRows.map((row) => (
              <MetricBar key={row.name} label={row.name} value={row.value} max={maxFastMetric} color={row.name.startsWith('A') ? typeColor(buildA.fast.type).bar : typeColor(buildB.fast.type).bar} />
            ))}
          </div>
          <h4 className="mt-4 text-xs font-semibold uppercase text-[rgb(var(--muted-foreground))]">
            STAB-adjusted output
          </h4>
          <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
            100 fast-move turns, STAB-adjusted, before opponent type effects.
          </p>
          <CumulativeOutputGraph
            series={[
              {
                label: 'A',
                total: bestOutputA,
                events: analyticsA.outputTimelines[Math.max(0, bestOutputIndexA)],
              },
              {
                label: 'B',
                total: bestOutputB,
                events: analyticsB.outputTimelines[Math.max(0, bestOutputIndexB)],
              },
            ]}
          />
        </Panel>
        <BuildPanel label="Build B" speciesTypes={species.types} fastMove={buildB.fast} chargedMoves={buildB.charged} analytics={analyticsB} chargedOptions={chargedMoves} maxTimelineTurns={maxTimelineTurns} setChargedOne={setChargedB1} setChargedTwo={setChargedB2} />
      </div>
    </div>
  )
}

function initialMovesetParams(data: ApplicationData): MovesetParams {
  const fallbackSpecies = data.pokemon.candidates[0]
  const fallback = {
    speciesId: fallbackSpecies.id,
    strategy: 'fastest-victory' as PokemonFocusStrategy,
    fastAId: undefined as string | undefined,
    chargedA1Id: undefined as string | undefined,
    chargedA2Id: undefined as string | undefined,
  }

  if (typeof window === 'undefined') {
    return fallback
  }

  const [, query = ''] = window.location.hash.split('?')
  const params = new URLSearchParams(query)
  const species =
    data.pokemon.candidates.find((candidate) => candidate.id === params.get('pokemon')) ??
    fallbackSpecies
  const strategy = parseFocusStrategy(params.get('strategy')) ?? fallback.strategy

  const fastAId = params.get('fastA') ?? undefined
  const chargedA1Id = params.get('chargedA1') ?? undefined
  const chargedA2Id = params.get('chargedA2') ?? undefined

  return {
    speciesId: species.id,
    strategy,
    fastAId: fastAId && species.fastMoves.includes(fastAId) ? fastAId : undefined,
    chargedA1Id:
      chargedA1Id && species.chargedMoves.includes(chargedA1Id) ? chargedA1Id : undefined,
    chargedA2Id:
      chargedA2Id && species.chargedMoves.includes(chargedA2Id) ? chargedA2Id : undefined,
  }
}

function initialComparatorBuilds(
  data: ApplicationData,
  species: PokemonSpecies,
  params: MovesetParams,
) {
  const strategy = params.strategy ?? 'fastest-victory'
  const recommendedA = movesetIdsForStrategy(data, species, strategy)
  const a = {
    fastId: params.fastAId ?? recommendedA.fastId,
    chargedOneId: params.chargedA1Id ?? recommendedA.chargedOneId,
    chargedTwoId: params.chargedA2Id ?? recommendedA.chargedTwoId,
  }
  const strategyB = alternateFocusStrategy(strategy)
  const recommendedB = movesetIdsForStrategy(data, species, strategyB)

  return {
    a,
    b: distinctMovesetIds(a, recommendedB, data, species, strategyB),
  }
}

function movesetIdsForStrategy(
  data: ApplicationData,
  species: PokemonSpecies,
  strategy: PokemonFocusStrategy,
): MovesetIds {
  const moveset = bestMovesetForStrategy(species, data.moves, strategy, 40)

  return {
    fastId: moveset.fastMove.id,
    chargedOneId: moveset.chargedMoves[0].id,
    chargedTwoId: moveset.chargedMoves[1].id,
  }
}

function distinctMovesetIds(
  a: MovesetIds,
  candidate: MovesetIds,
  data: ApplicationData,
  species: PokemonSpecies,
  strategy: PokemonFocusStrategy,
): MovesetIds {
  if (!sameMoveset(a, candidate)) {
    return candidate
  }

  const maps = moveMaps(data)
  const fastMoves = species.fastMoves
    .map((id) => maps.fast.get(id))
    .filter((move): move is FastMove => Boolean(move))
  const chargedMoves = species.chargedMoves
    .map((id) => maps.charged.get(id))
    .filter((move): move is ChargedMove => Boolean(move))
  const alternatives: Array<{ ids: MovesetIds; score: number }> = []

  for (const fastMove of fastMoves) {
    for (let first = 0; first < chargedMoves.length; first += 1) {
      for (let second = first + 1; second < chargedMoves.length; second += 1) {
        const chargedPair: [ChargedMove, ChargedMove] = [
          chargedMoves[first],
          chargedMoves[second],
        ]
        const ids: MovesetIds = {
          fastId: fastMove.id,
          chargedOneId: chargedPair[0].id,
          chargedTwoId: chargedPair[1].id,
        }
        if (sameMoveset(a, ids)) {
          continue
        }
        const analytics = analyzeMoveset(species, fastMove, chargedPair)
        const firstChargeTurns = Math.min(...analytics.timings.map((timing) => timing.firstTurns))
        const repeatChargeTurns = Math.min(...analytics.timings.map((timing) => timing.repeatTurns))
        const neutralOutputPerTurn =
          Math.max(...analytics.neutralOutput.map((output) => output.totalPower)) / 100
        const score =
          strategy === 'fastest-victory'
            ? neutralOutputPerTurn * 100 + analytics.fast.damagePerTurn * 16 + 100 / firstChargeTurns
            : 100 / firstChargeTurns + 100 / repeatChargeTurns + analytics.cheapChargedMoveCount * 20
        alternatives.push({ ids, score })
      }
    }
  }

  return alternatives.sort((left, right) => right.score - left.score)[0]?.ids ?? candidate
}

function sameMoveset(a: MovesetIds, b: MovesetIds) {
  return (
    a.fastId === b.fastId &&
    a.chargedOneId === b.chargedOneId &&
    a.chargedTwoId === b.chargedTwoId
  )
}

function parseFocusStrategy(value: string | null): PokemonFocusStrategy | undefined {
  return value === 'fastest-victory' ||
    value === 'charged-pause-control' ||
    value === 'practical-spam'
    ? value
    : undefined
}

function alternateFocusStrategy(strategy: PokemonFocusStrategy): PokemonFocusStrategy {
  return strategy === 'fastest-victory' ? 'charged-pause-control' : 'fastest-victory'
}

function CumulativeOutputGraph({
  series,
}: {
  series: Array<{ label: 'A' | 'B'; total: number; events: OutputTimelineEvent[] }>
}) {
  const width = 300
  const rowHeight = 88
  const padding = { left: 34, right: 10, top: 10, bottom: 18 }
  const plotWidth = width - padding.left - padding.right
  const height = padding.top + padding.bottom + rowHeight * series.length
  const maxTotal = Math.max(...series.map((item) => item.total), 1)

  function x(turn: number) {
    return padding.left + (turn / 100) * plotWidth
  }

  function y(rowIndex: number, cumulativePower: number) {
    const rowTop = padding.top + rowIndex * rowHeight
    const plotHeight = rowHeight - 30
    return rowTop + plotHeight - (cumulativePower / maxTotal) * plotHeight
  }

  function areaPath(rowIndex: number, events: OutputTimelineEvent[]) {
    const rowTop = padding.top + rowIndex * rowHeight
    const baseline = rowTop + rowHeight - 26
    const commands = [`M ${x(0)} ${baseline}`, `L ${x(0)} ${y(rowIndex, 0)}`]

    for (const event of events) {
      commands.push(`H ${x(event.turnEnd)}`, `V ${y(rowIndex, event.cumulativePower)}`)
    }

    commands.push(`H ${x(100)}`, `V ${baseline}`, 'Z')
    return commands.join(' ')
  }

  return (
    <div className="mt-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Cumulative STAB-adjusted output over 100 turns"
      >
        <line
          x1={padding.left}
          x2={padding.left + plotWidth}
          y1={height - padding.bottom}
          y2={height - padding.bottom}
          stroke="rgb(var(--border))"
        />
        {[0, 50, 100].map((turn) => (
          <g key={turn}>
            <line
              x1={x(turn)}
              x2={x(turn)}
              y1={padding.top}
              y2={height - padding.bottom}
              stroke="rgb(var(--border))"
              strokeDasharray={turn === 0 ? undefined : '3 3'}
            />
            <text
              x={x(turn)}
              y={height - 5}
              textAnchor={turn === 0 ? 'start' : turn === 100 ? 'end' : 'middle'}
              fontSize="9"
              fill="rgb(var(--muted-foreground))"
            >
              {turn}T
            </text>
          </g>
        ))}
        {series.map((item, rowIndex) => {
          const rowTop = padding.top + rowIndex * rowHeight
          const baseline = rowTop + rowHeight - 26
          const ceilingY = y(rowIndex, item.total)
          const areaColor = item.label === 'A' ? typeColor(item.events[0]?.moveType ?? 'dark').bar : typeColor(item.events[0]?.moveType ?? 'water').bar
          const chargedEvents = item.events.filter((event) => event.kind === 'charged')
          const fastEvents = item.events.filter((event) => event.kind === 'fast')

          return (
            <g key={item.label}>
              <text
                x="0"
                y={rowTop + 10}
                fontSize="10"
                fontWeight="700"
                fill="rgb(var(--foreground))"
              >
                {item.label}
              </text>
              <text
                x="0"
                y={rowTop + 25}
                fontSize="10"
                fontWeight="700"
                fill="rgb(var(--foreground))"
              >
                {number(item.total, 0)}
              </text>
              <path
                d={areaPath(rowIndex, item.events)}
                fill={areaColor}
                fillOpacity="0.28"
                stroke="rgb(var(--foreground))"
                strokeOpacity="0.62"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
              <line
                x1={padding.left}
                x2={padding.left + plotWidth}
                y1={ceilingY}
                y2={ceilingY}
                stroke="rgb(var(--foreground))"
                strokeDasharray="3 4"
                strokeOpacity="0.34"
              />
              {fastEvents.map((event, eventIndex) => {
                const color = typeColor(event.moveType)

                return (
                  <rect
                    key={`${item.label}-fast-${eventIndex}`}
                    x={x(event.turnStart)}
                    y={baseline + 6}
                    width={Math.max(1, x(event.turnEnd) - x(event.turnStart) - 0.5)}
                    height="8"
                    fill={color.bar}
                    opacity="0.82"
                  >
                    <title>{`${item.label}: ${event.moveName} +${number(event.addedPower, 0)} from ${event.turnStart}T to ${event.turnEnd}T`}</title>
                  </rect>
                )
              })}
              {chargedEvents.map((event, eventIndex) => {
                const color = typeColor(event.moveType)
                return (
                  <circle
                    key={`${item.label}-charged-${eventIndex}`}
                    cx={x(event.turnEnd)}
                    cy={baseline + 10}
                    r="3.2"
                    fill={color.bar}
                    stroke="rgb(var(--foreground))"
                    strokeOpacity="0.42"
                    strokeWidth="0.9"
                  >
                    <title>{`${item.label}: ${event.moveName} +${number(event.addedPower, 0)} at ${event.turnEnd}T`}</title>
                  </circle>
                )
              })}
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10px] text-[rgb(var(--muted-foreground))]">
        <span>Area: cumulative output</span>
        <span>Bars: fast moves</span>
        <span>Dots: charged events</span>
      </div>
    </div>
  )
}

function ComparisonLine({
  label,
  a,
  b,
  winner,
}: {
  label: string
  a: string
  b: string
  winner: 'A' | 'B' | 'tie'
}) {
  return (
    <div className="py-2 first:pt-0 last:pb-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="font-medium">{label}</span>
        <Badge tone={winner === 'tie' ? 'neutral' : 'ok'}>
          {winner === 'tie' ? 'Tie' : `Build ${winner}`}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[rgb(var(--muted-foreground))]">
        <span>A: {a}</span>
        <span>B: {b}</span>
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
  maxTimelineTurns,
  setChargedOne,
  setChargedTwo,
}: {
  label: string
  speciesTypes: string[]
  fastMove: FastMove
  chargedMoves: [ChargedMove, ChargedMove]
  analytics: ReturnType<typeof analyzeMoveset>
  chargedOptions: ChargedMove[]
  maxTimelineTurns: number
  setChargedOne: (id: string) => void
  setChargedTwo: (id: string) => void
}) {
  const bestOutput = analytics.neutralOutput
    .slice()
    .sort((a, b) => b.totalPower - a.totalPower)[0]
  return (
    <Panel>
      <PanelHeader
        title={label}
        subtitle={`${fastMove.name}: ${number(analytics.fast.damagePerTurn)} DPT / ${number(analytics.fast.energyPerTurn)} EPT`}
        right={<FastMoveMeta fastMove={fastMove} />}
      />
      <div className="grid gap-3 p-3">
        <div className="grid gap-2">
          <DataSelect label={`${label} Charged 1`} value={chargedMoves[0].id} selectedType={chargedMoves[0].type} onChange={setChargedOne} options={chargedOptions.map((move) => ({ value: move.id, label: chargedMoveLabel(move), type: move.type }))} />
          <DataSelect label={`${label} Charged 2`} value={chargedMoves[1].id} selectedType={chargedMoves[1].type} onChange={setChargedTwo} options={chargedOptions.map((move) => ({ value: move.id, label: chargedMoveLabel(move), type: move.type }))} />
        </div>
        <div className="rounded bg-[rgb(var(--muted)/0.24)] px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase text-[rgb(var(--muted-foreground))]">
              Best STAB-adjusted 100T output
            </p>
            <TypeChip type={bestOutput.chargedMoveType} label={bestOutput.chargedMoveName} compact />
          </div>
          <p className="mt-1 text-xl font-semibold">{number(bestOutput.totalPower, 0)}</p>
          <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">
            {bestOutput.fastMoveUses} fast moves plus {bestOutput.chargedMoveUses} charged moves over {bestOutput.budgetTurns} fast-move turns.
          </p>
        </div>
        <div className="grid gap-3 rounded bg-[rgb(var(--muted)/0.18)] px-3 py-2.5">
          {analytics.timings.map((timing, index) => (
            <div
              key={timing.chargedMoveId}
              className={index > 0 ? 'border-t border-[rgb(var(--border)/0.65)] pt-3' : undefined}
            >
              <ChargeTimeline timing={timing} maxTurns={maxTimelineTurns} />
              <RepeatPattern timing={timing} />
            </div>
          ))}
        </div>
        <div className="divide-y divide-[rgb(var(--border)/0.65)] rounded bg-[rgb(var(--muted)/0.16)]">
          {analytics.neutralOutput.map((output) => (
            <div
              key={output.chargedMoveId}
              className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
            >
              <span className="inline-flex items-center gap-2">
                <TypeChip type={output.chargedMoveType} label={output.chargedMoveName} compact />
                adjusted 100T output
              </span>
              <span className="text-[rgb(var(--muted-foreground))]">
                {output.chargedMoveHasStab ? 'charged STAB' : 'no charged STAB'}
              </span>
              <span className="font-semibold">{number(output.totalPower, 0)}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

function FastMoveMeta({ fastMove }: { fastMove: FastMove }) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5 text-[11px]">
      <TypeChip type={fastMove.type} compact />
      <span className="rounded bg-[rgb(var(--muted)/0.42)] px-1.5 py-0.5 text-[rgb(var(--muted-foreground))]">
        {fastMove.power} power
      </span>
      <span className="rounded bg-[rgb(var(--muted)/0.42)] px-1.5 py-0.5 text-[rgb(var(--muted-foreground))]">
        +{fastMove.energyGain} energy
      </span>
      <span className="rounded bg-[rgb(var(--muted)/0.42)] px-1.5 py-0.5 text-[rgb(var(--muted-foreground))]">
        {fastMove.turns}T / {number(fastMove.turns * 0.5)}s
      </span>
    </div>
  )
}

function RepeatPattern({
  timing,
}: {
  timing: ReturnType<typeof analyzeMoveset>['timings'][number]
}) {
  const pattern = [
    timing.firstFastMoveCount,
    timing.repeatFastMoveCount,
    timing.repeatFastMoveCount,
    timing.repeatFastMoveCount,
  ]

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase text-[rgb(var(--muted-foreground))]">
          Repeat pattern
        </p>
        <p className="text-[10px] text-[rgb(var(--muted-foreground))]">
          fast moves
        </p>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-base font-semibold tracking-normal">
        {pattern.map((count, index) => (
          <span key={index} className="inline-flex items-center gap-1.5">
            <span>{count}</span>
            {index < pattern.length - 1 && (
              <span className="text-[rgb(var(--muted-foreground))]">.</span>
            )}
          </span>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-[rgb(var(--muted-foreground))]">
        {number(timing.firstSeconds)}s first, then {number(timing.repeatSeconds)}s repeats with +{timing.leftoverEnergyAfterFirst} energy left.
      </p>
    </div>
  )
}

function fastMoveLabel(move: FastMove) {
  return `${move.name} · ${typeAbbreviation(move.type)} · DPT ${number(move.power / move.turns)} · EPT ${number(move.energyGain / move.turns)}`
}

function chargedMoveLabel(move: ChargedMove) {
  return `${move.name} · ${typeAbbreviation(move.type)} · P${move.power} · E${move.energyCost}`
}
