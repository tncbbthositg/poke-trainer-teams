import { useMemo, useState } from 'react'
import { Badge } from '../../components/atoms/Badge'
import { TypeChip } from '../../components/atoms/TypeChip'
import { typeAbbreviation } from '../../components/atoms/typeLabels'
import { ChargeTimeline } from '../../components/molecules/charts/ChargeTimeline'
import { Panel, PanelHeader } from '../../components/molecules/Panel'
import type { ApplicationData } from '../../data/loaders'
import type { ChargedMove, FastMove } from '../../data/schemas/moves'
import type { PokemonType } from '../../data/schemas/pokemon'
import { analyzeMoveset, type OutputTimelineEvent } from '../../domain/moves/analytics'
import { typeColor } from '../../domain/types/typeColors'
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
          <Select label="Pokemon" value={species.id} onChange={setSpeciesId} options={data.pokemon.candidates.map((candidate) => ({ value: candidate.id, label: candidate.name }))} />
          <Select label="Build A fast" value={buildA.fast.id} selectedType={buildA.fast.type} onChange={setFastAId} options={fastMoves.map((move) => ({ value: move.id, label: fastMoveLabel(move), type: move.type }))} />
          <Select label="Build B fast" value={buildB.fast.id} selectedType={buildB.fast.type} onChange={setFastBId} options={fastMoves.map((move) => ({ value: move.id, label: fastMoveLabel(move), type: move.type }))} />
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

function MetricBar({
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
          className="h-3 rounded-sm bg-[#0891b2]"
          style={{ width, backgroundColor: color }}
          role="img"
          aria-label={`${label}: ${number(value, digits)}`}
        />
      </div>
    </div>
  )
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
          <Select label="Charged 1" value={chargedMoves[0].id} selectedType={chargedMoves[0].type} onChange={setChargedOne} options={chargedOptions.map((move) => ({ value: move.id, label: chargedMoveLabel(move), type: move.type }))} />
          <Select label="Charged 2" value={chargedMoves[1].id} selectedType={chargedMoves[1].type} onChange={setChargedTwo} options={chargedOptions.map((move) => ({ value: move.id, label: chargedMoveLabel(move), type: move.type }))} />
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
  return `${move.name} · ${typeAbbreviation(move.type)} · P${move.power} · +E${move.energyGain} · ${move.turns}T`
}

function chargedMoveLabel(move: ChargedMove) {
  return `${move.name} · ${typeAbbreviation(move.type)} · P${move.power} · E${move.energyCost}`
}

function Select({
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
  options: Array<{ value: string; label: string; type?: PokemonType }>
}) {
  const selectedColor = selectedType ? typeColor(selectedType) : undefined

  return (
    <label className="grid min-w-0 gap-1 text-xs font-medium text-[rgb(var(--muted-foreground))]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 min-w-0 truncate rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel))] px-2 text-xs text-[rgb(var(--foreground))]"
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
