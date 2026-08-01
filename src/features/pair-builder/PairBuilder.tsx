import { useMemo, useState } from 'react'
import {
  Activity,
  Flag,
  Pause,
  RotateCcw,
  Shield,
  Skull,
  Swords,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { Badge } from '../../components/atoms/Badge'
import { MetricBar } from '../../components/atoms/MetricBar'
import { TypeChip, TypeChipList } from '../../components/atoms/TypeChip'
import { typeAbbreviation } from '../../components/atoms/typeLabels'
import { DataSelect } from '../../components/molecules/DataSelect'
import { Panel, PanelHeader } from '../../components/molecules/Panel'
import type { ApplicationData } from '../../data/loaders'
import type { ChargedMove, FastMove } from '../../data/schemas/moves'
import type { PokemonSpecies } from '../../data/schemas/pokemon'
import { simulateRocketLineupExperimental } from '../../domain/battle/engine'
import type { BattleEvent, BattleStrategy } from '../../domain/battle/types'
import { analyzeMoveset } from '../../domain/moves/analytics'
import type { PokemonBuild } from '../../domain/pokemon/types'
import { calculateEffectiveStats } from '../../domain/stats/effectiveStats'
import { typeColor } from '../../domain/types/typeColors'
import { integer, number } from '../../lib/format'
import { moveMaps } from '../shared/dataHelpers'

type SlotState = {
  speciesId: string
  fastMoveId: string
  chargedOneId: string
  chargedTwoId: string
}

type SlotBuild = {
  species: PokemonSpecies
  fastMove: FastMove
  chargedMoves: [ChargedMove, ChargedMove]
}

export function PairBuilder({ data }: { data: ApplicationData }) {
  const maps = useMemo(() => moveMaps(data), [data])
  const [trainerLevel, setTrainerLevel] = useState(50)
  const [strategy, setStrategy] = useState<BattleStrategy>('charge-asap')
  const [lineupId, setLineupId] = useState(data.rocket.lineups[0]?.id ?? '')
  const [leadSlot, setLeadSlot] = useState(() => initialSlot(data.pokemon.candidates[0], data))
  const [backupSlot, setBackupSlot] = useState(() => initialSlot(data.pokemon.candidates[1], data))
  const lead = resolveSlot(leadSlot, data, maps)
  const backup = resolveSlot(backupSlot, data, maps)
  const lineup =
    data.rocket.lineups.find((candidate) => candidate.id === lineupId) ?? data.rocket.lineups[0]
  const boundedTrainerLevel = Math.min(50, Math.max(1, trainerLevel))
  const result = useMemo(
    () =>
      simulateRocketLineupExperimental({
        lead: toPokemonBuild(lead, boundedTrainerLevel),
        backup: toPokemonBuild(backup, boundedTrainerLevel),
        lineup,
        mechanics: data.mechanics,
        strategy,
      }),
    [backup, boundedTrainerLevel, data.mechanics, lead, lineup, strategy],
  )

  return (
    <div className="grid gap-4">
      <Panel>
        <PanelHeader
          title="Battle Simulation"
          subtitle="Experimental Rocket proxy simulation for a two-Pokemon team. Third slot remains outside calculations."
          right={<Badge tone="warning">Experimental proxy</Badge>}
        />
        <div className="grid gap-3 p-3 md:grid-cols-3">
          <label className="grid gap-1 text-xs font-medium text-[rgb(var(--muted-foreground))]">
            Trainer Level
            <input
              type="number"
              min={1}
              max={50}
              value={trainerLevel}
              onChange={(event) => setTrainerLevel(Number(event.target.value))}
              className="h-9 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel))] px-2 text-sm text-[rgb(var(--foreground))]"
            />
          </label>
          <DataSelect
            label="Strategy"
            value={strategy}
            onChange={(value) => setStrategy(value as BattleStrategy)}
            options={[
              { value: 'charge-asap', label: 'Charge ASAP' },
              { value: 'fastest-expected-knockout', label: 'Fastest expected knockout' },
              { value: 'shield-breaker', label: 'Shield breaker' },
              { value: 'preserve-lead', label: 'Preserve lead' },
              { value: 'minimal-interaction', label: 'Minimal interaction' },
            ]}
          />
          <div className="flex flex-wrap items-end gap-2">
            <Badge tone="info">Trainer Level {trainerLevel}</Badge>
            <Badge tone="warning">{strategy}</Badge>
            <Badge tone="danger">Third slot unavailable</Badge>
          </div>
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <TeamSlot
          role="Lead"
          slot={leadSlot}
          build={lead}
          data={data}
          maps={maps}
          trainerLevel={trainerLevel}
          onChange={setLeadSlot}
        />
        <TeamSlot
          role="Backup"
          slot={backupSlot}
          build={backup}
          data={data}
          maps={maps}
          trainerLevel={trainerLevel}
          onChange={setBackupSlot}
        />
      </div>
      <Panel className="p-3">
        <div className="grid gap-3 md:grid-cols-[minmax(260px,360px)_1fr]">
          <DataSelect
            label="Rocket Lineup"
            value={lineup.id}
            onChange={setLineupId}
            options={data.rocket.lineups.map((candidate) => ({
              value: candidate.id,
              label: `${candidate.trainerName} · ${candidate.sourceAgreement}`,
            }))}
          />
          <div className="grid content-end gap-1">
            <h3 className="text-sm font-semibold">Rocket Lineup</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="info">{lineup.trainerName}</Badge>
              <span className="font-semibold text-[rgb(var(--foreground))]">
                {lineup.slots.map((slot) => formatLineupBranch(slot.pokemonIds[0])).join(' -> ')}
              </span>
              <Badge tone="warning">Proxy assumptions</Badge>
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-[rgb(var(--border))] pt-3">
          <h3 className="mb-3 text-sm font-semibold">Battle Simulation Result</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">Experimental proxy simulation</Badge>
            <Badge tone={result.outcome === 'win' ? 'ok' : 'danger'}>
              {result.outcome === 'win' ? 'Proxy win' : 'Proxy loss'}
            </Badge>
            <Badge tone="info">{lead.species.name} lead</Badge>
            <Badge tone="info">{backup.species.name} backup</Badge>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <PreviewMetric label="Turns" value={integer(result.totalTurns)} />
          <PreviewMetric label="Clock" value={`${number(result.wallClockSeconds)}s`} />
          <PreviewMetric label="Fast attacks" value={integer(result.fastAttacksUsed)} />
          <PreviewMetric label="Charged attacks" value={integer(result.chargedAttacksUsed)} />
        </div>
        <BattleTimeline events={result.events} totalTurns={result.totalTurns} />
      </Panel>
    </div>
  )
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-[rgb(var(--muted)/0.18)] px-3 py-2">
      <div className="text-[10px] font-semibold uppercase text-[rgb(var(--muted-foreground))]">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-[rgb(var(--foreground))]">{value}</div>
    </div>
  )
}

function BattleTimeline({ events, totalTurns }: { events: BattleEvent[]; totalTurns: number }) {
  const visibleEvents = events.filter((event) => event.kind !== 'fast-start')
  const maxTurn = Math.max(totalTurns, ...visibleEvents.map((event) => event.turn), 1)
  const width = Math.max(920, maxTurn * 12)
  const playerEvents = visibleEvents.filter((event) => event.actor === 'player')
  const rocketEvents = visibleEvents.filter((event) => event.actor === 'rocket')
  const systemEvents = visibleEvents.filter((event) => event.actor === 'system')
  const tickInterval = maxTurn <= 60 ? 10 : 20
  const ticks = Array.from(
    { length: Math.floor(maxTurn / tickInterval) + 1 },
    (_, index) => index * tickInterval,
  )

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-xs font-semibold uppercase text-[rgb(var(--muted-foreground))]">
          Timeline
        </h4>
        <div className="flex items-center gap-3 text-[11px] text-[rgb(var(--muted-foreground))]">
          <TimelineLegend tone="player" label="Player" />
          <TimelineLegend tone="rocket" label="Rocket" />
          <TimelineLegend tone="system" label="System" />
        </div>
      </div>
      <div className="overflow-x-auto rounded border border-[rgb(var(--border))] bg-[rgb(var(--muted)/0.12)]">
        <div className="p-3" style={{ width }}>
          <TimelineTrack
            label="Player"
            events={playerEvents}
            maxTurn={maxTurn}
            lane="player"
          />
          <div className="relative my-2 h-10">
            <div className="absolute left-0 right-0 top-4 h-px bg-[rgb(var(--border))]" />
            {ticks.map((tick) => (
              <div
                key={tick}
                className="absolute top-0 grid -translate-x-1/2 justify-items-center gap-1 text-[10px] font-semibold text-[rgb(var(--muted-foreground))]"
                style={{ left: `${(tick / maxTurn) * 100}%` }}
              >
                <span className="h-3 w-px bg-[rgb(var(--border))]" />
                <span>{number(tick * 0.5)}s</span>
              </div>
            ))}
            {systemEvents.map((event, index) => (
              <TimelineChip
                key={`${event.turn}-${event.actor}-${event.kind}-${index}`}
                event={event}
                maxTurn={maxTurn}
                lane="system"
              />
            ))}
          </div>
          <TimelineTrack label="Rocket" events={rocketEvents} maxTurn={maxTurn} lane="rocket" />
        </div>
      </div>
    </div>
  )
}

function TimelineTrack({
  label,
  events,
  maxTurn,
  lane,
}: {
  label: string
  events: BattleEvent[]
  maxTurn: number
  lane: 'player' | 'rocket'
}) {
  const hpPoints = hpSeries(events, lane)

  return (
    <div className="grid gap-1">
      <div className="text-[11px] font-semibold uppercase text-[rgb(var(--muted-foreground))]">
        {label}
      </div>
      <div className="relative h-20 rounded bg-[rgb(var(--panel)/0.54)]">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-[rgb(var(--border)/0.75)]" />
        {hpPoints.length > 0 ? (
          <svg
            className="absolute inset-x-0 top-1 h-16 overflow-visible"
            viewBox={`0 0 ${maxTurn} 100`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <polyline
              points={hpPolyline(hpPoints, maxTurn)}
              fill="none"
              stroke={lane === 'player' ? 'rgb(var(--primary))' : 'rgb(var(--danger))'}
              strokeOpacity="0.7"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ) : null}
        {events.map((event, index) => (
          <TimelineChip
            key={`${event.turn}-${event.actor}-${event.kind}-${index}`}
            event={event}
            maxTurn={maxTurn}
            lane={lane}
          />
        ))}
      </div>
    </div>
  )
}

function TimelineLegend({
  tone,
  label,
}: {
  tone: 'player' | 'rocket' | 'system'
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${timelineTone(tone).dot}`} />
      {label}
    </span>
  )
}

function TimelineChip({
  event,
  maxTurn,
  lane,
}: {
  event: BattleEvent
  maxTurn: number
  lane: 'player' | 'rocket' | 'system'
}) {
  const Icon = timelineIcons[event.kind]
  const tone = timelineTone(event.actor)
  const label = compactEventLabel(event)
  const left = `${(event.turn / maxTurn) * 100}%`
  const pauseTurns = event.kind === 'pause' ? parseTurns(event.message) : 0
  const spanWidth = pauseTurns ? `${Math.max(16, (pauseTurns / maxTurn) * 100)}%` : undefined
  const verticalClass =
    lane === 'system'
      ? 'top-1'
      : event.kind === 'pokemon-enter' || event.kind === 'switch' || event.kind === 'faint'
        ? 'top-2'
        : event.kind === 'shield' || event.kind === 'pause' || event.kind === 'charged-attack'
          ? 'top-6'
          : 'top-9'
  const compact = event.kind === 'fast-resolve'

  return (
    <span
      className={`absolute ${verticalClass} inline-flex items-center justify-center gap-1 border font-semibold shadow-sm ${compact ? 'h-4 w-4 -translate-x-1/2 rounded-sm p-0' : 'h-7 max-w-28 -translate-x-1/2 rounded-full px-2 text-[11px]'} ${tone.chip}`}
      style={{ left, width: spanWidth }}
      title={`${number(event.wallClockSeconds)}s · ${timelineLabel(event.kind)} · ${event.message}`}
      aria-label={`${number(event.wallClockSeconds)} seconds ${timelineLabel(event.kind)} ${label}`}
    >
      <Icon className={`${compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} shrink-0 ${tone.icon}`} aria-hidden />
      {compact ? null : <span className="truncate">{label}</span>}
    </span>
  )
}

function timelineTone(actor: BattleEvent['actor']) {
  if (actor === 'player') {
    return {
      card: 'bg-[rgb(var(--primary)/0.1)]',
      chip:
        'border-[rgb(var(--primary)/0.38)] bg-[rgb(var(--primary)/0.12)] text-[rgb(var(--foreground))]',
      dot: 'bg-[rgb(var(--primary))]',
      icon: 'text-[rgb(var(--primary))]',
    }
  }

  if (actor === 'rocket') {
    return {
      card: 'bg-[rgb(var(--danger)/0.08)]',
      chip:
        'border-[rgb(var(--danger)/0.34)] bg-[rgb(var(--danger)/0.1)] text-[rgb(var(--foreground))]',
      dot: 'bg-[rgb(var(--danger))]',
      icon: 'text-[rgb(var(--danger))]',
    }
  }

  return {
    card: 'bg-[rgb(var(--muted)/0.42)]',
    chip:
      'border-[rgb(var(--border))] bg-[rgb(var(--panel))] text-[rgb(var(--foreground))]',
    dot: 'bg-[rgb(var(--muted-foreground))]',
    icon: 'text-[rgb(var(--muted-foreground))]',
  }
}

const timelineIcons: Record<BattleEvent['kind'], LucideIcon> = {
  'pokemon-enter': Activity,
  'fast-start': Zap,
  'fast-resolve': Zap,
  'charged-attack': Swords,
  shield: Shield,
  buff: Activity,
  faint: Skull,
  switch: RotateCcw,
  pause: Pause,
  'battle-end': Flag,
}

function timelineLabel(kind: BattleEvent['kind']) {
  const labels: Record<BattleEvent['kind'], string> = {
    'pokemon-enter': 'Enter',
    'fast-start': 'Fast start',
    'fast-resolve': 'Fast attack',
    'charged-attack': 'Charged attack',
    shield: 'Shield',
    buff: 'Buff',
    faint: 'Faint',
    switch: 'Switch',
    pause: 'Pause',
    'battle-end': 'Battle end',
  }

  return labels[kind]
}

function compactEventLabel(event: BattleEvent) {
  const message = event.message

  if (event.kind === 'pokemon-enter') {
    return message.match(/^([^ ]+)/)?.[1] ?? 'Enter'
  }

  if (event.kind === 'fast-resolve') {
    const fastMove = message.match(/^([^;]+)/)?.[1]
    const hp = message.match(/HP is (\d+)/)?.[1]
    return hp ? `${fastMove ?? 'Fast'} HP ${hp}` : (fastMove ?? 'Fast')
  }

  if (event.kind === 'charged-attack') {
    return message.match(/uses ([^;]+)/)?.[1] ?? 'Charged'
  }

  if (event.kind === 'shield') {
    const shields = message.match(/(\d+) shield/)?.[1]
    return shields ? `Shield ${shields}` : 'Shield'
  }

  if (event.kind === 'pause') {
    const turns = message.match(/(\d+) turn/)?.[1]
    return turns ? `Pause ${turns}T` : 'Pause'
  }

  if (event.kind === 'faint') {
    return message.match(/^([^ ]+)/)?.[1] ?? 'Faint'
  }

  if (event.kind === 'switch') {
    return message.match(/^([^ ]+)/)?.[1] ?? 'Switch'
  }

  if (event.kind === 'battle-end') {
    return 'End'
  }

  return timelineLabel(event.kind)
}

function hpSeries(events: BattleEvent[], lane: 'player' | 'rocket') {
  const points = events
    .map((event) => {
      const hp = Number(event.message.match(/HP is (\d+)/)?.[1])
      return Number.isFinite(hp) ? { turn: event.turn, hp } : undefined
    })
    .filter((point): point is { turn: number; hp: number } => Boolean(point))
  const maxHp = Math.max(...points.map((point) => point.hp), 1)
  const normalized = points.map((point) => ({
    turn: point.turn,
    hp: lane === 'player' ? (point.hp / maxHp) * 100 : (point.hp / maxHp) * 100,
  }))

  return normalized
}

function hpPolyline(points: Array<{ turn: number; hp: number }>, maxTurn: number) {
  const first = points[0]
  const seeded = first && first.turn > 0 ? [{ turn: 0, hp: 100 }, ...points] : points
  const extended = seeded.at(-1)?.turn === maxTurn ? seeded : [...seeded, { turn: maxTurn, hp: seeded.at(-1)?.hp ?? 100 }]

  return extended.map((point) => `${point.turn},${100 - point.hp}`).join(' ')
}

function parseTurns(message: string) {
  return Number(message.match(/(\d+) turn/)?.[1] ?? 0)
}

function TeamSlot({
  role,
  slot,
  build,
  data,
  maps,
  trainerLevel,
  onChange,
}: {
  role: string
  slot: SlotState
  build: SlotBuild
  data: ApplicationData
  maps: ReturnType<typeof moveMaps>
  trainerLevel: number
  onChange: (slot: SlotState) => void
}) {
  const analytics = analyzeMoveset(build.species, build.fastMove, build.chargedMoves)
  const stats = calculateEffectiveStats(build.species, Math.min(50, Math.max(1, trainerLevel)))
  const fastMoves = legalFastMoves(build.species, maps)
  const chargedMoves = legalChargedMoves(build.species, maps)
  const maxFastMetric = Math.max(analytics.fast.damagePerTurn, analytics.fast.energyPerTurn, 1)

  function setSpecies(speciesId: string) {
    const species = data.pokemon.candidates.find((candidate) => candidate.id === speciesId)
    if (!species) {
      return
    }
    onChange(initialSlot(species, data))
  }

  function setChargedOne(chargedOneId: string) {
    onChange(normalizeChargedPair({ ...slot, chargedOneId }, chargedMoves))
  }

  function setChargedTwo(chargedTwoId: string) {
    onChange(normalizeChargedPair({ ...slot, chargedTwoId }, chargedMoves))
  }

  return (
    <Panel>
      <PanelHeader
        title={role}
        subtitle={`${build.species.name} · CP ${integer(stats.cp)} · ${integer(stats.hp)} HP`}
        right={<TypeChipList types={build.species.types} compact />}
      />
      <div className="grid gap-3 p-3">
        <DataSelect
          label={`${role} Pokemon`}
          value={build.species.id}
          onChange={setSpecies}
          options={data.pokemon.candidates.map((candidate) => ({
            value: candidate.id,
            label: candidate.name,
          }))}
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <DataSelect
            label="Fast move"
            value={build.fastMove.id}
            selectedType={build.fastMove.type}
            onChange={(fastMoveId) => onChange({ ...slot, fastMoveId })}
            options={fastMoves.map((move) => ({
              value: move.id,
              label: fastMoveLabel(move),
              type: move.type,
            }))}
          />
          <DataSelect
            label="Charged 1"
            value={build.chargedMoves[0].id}
            selectedType={build.chargedMoves[0].type}
            onChange={setChargedOne}
            options={chargedMoves.map((move) => ({
              value: move.id,
              label: chargedMoveLabel(move),
              type: move.type,
            }))}
          />
          <DataSelect
            label="Charged 2"
            value={build.chargedMoves[1].id}
            selectedType={build.chargedMoves[1].type}
            onChange={setChargedTwo}
            options={chargedMoves.map((move) => ({
              value: move.id,
              label: chargedMoveLabel(move),
              type: move.type,
            }))}
          />
        </div>
        <TeamSlotSummary
          analytics={analytics}
          fastMove={build.fastMove}
          chargedMoves={build.chargedMoves}
          maxFastMetric={maxFastMetric}
        />
      </div>
    </Panel>
  )
}

function TeamSlotSummary({
  analytics,
  fastMove,
  chargedMoves,
  maxFastMetric,
}: {
  analytics: ReturnType<typeof analyzeMoveset>
  fastMove: FastMove
  chargedMoves: [ChargedMove, ChargedMove]
  maxFastMetric: number
}) {
  const timings = chargedMoves.map((chargedMove) => ({
    chargedMove,
    timing: analytics.timings.find((item) => item.chargedMoveId === chargedMove.id),
  }))

  return (
    <div className="grid gap-3 rounded bg-[rgb(var(--muted)/0.18)] px-3 py-2.5">
      <div>
        <h4 className="mb-2 text-[10px] font-semibold uppercase text-[rgb(var(--muted-foreground))]">
          Fast move pressure
        </h4>
        <div className="grid gap-2">
          <MetricBar
            label="DPT"
            value={analytics.fast.damagePerTurn}
            max={maxFastMetric}
            color={typeColor(fastMove.type).bar}
          />
          <MetricBar
            label="EPT"
            value={analytics.fast.energyPerTurn}
            max={maxFastMetric}
            color={typeColor(fastMove.type).bar}
          />
        </div>
      </div>
      <div>
        <h4 className="mb-2 text-[10px] font-semibold uppercase text-[rgb(var(--muted-foreground))]">
          First charged attack
        </h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {timings.map(({ chargedMove, timing }) => (
            <div
              key={chargedMove.id}
              className="flex min-w-0 items-center gap-2 rounded bg-[rgb(var(--panel)/0.58)] px-2 py-1.5 text-xs"
            >
              <TypeChip type={chargedMove.type} label={chargedMove.name} compact />
              <span className="shrink-0 text-[rgb(var(--muted-foreground))]">
                {timing
                  ? `${timing.firstFastMoveCount} fast / ${number(timing.firstSeconds)}s`
                  : 'No timing'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function initialSlot(species: PokemonSpecies, data: ApplicationData): SlotState {
  const maps = moveMaps(data)
  const fastMoves = legalFastMoves(species, maps)
  const chargedMoves = legalChargedMoves(species, maps)
  return {
    speciesId: species.id,
    fastMoveId: fastMoves[0].id,
    chargedOneId: chargedMoves[0].id,
    chargedTwoId: chargedMoves[1]?.id ?? chargedMoves[0].id,
  }
}

function resolveSlot(
  slot: SlotState,
  data: ApplicationData,
  maps: ReturnType<typeof moveMaps>,
): SlotBuild {
  const species = data.pokemon.candidates.find((candidate) => candidate.id === slot.speciesId) ?? data.pokemon.candidates[0]
  const fastMoves = legalFastMoves(species, maps)
  const chargedMoves = legalChargedMoves(species, maps)
  const fastMove = fastMoves.find((move) => move.id === slot.fastMoveId) ?? fastMoves[0]
  const chargedOne = chargedMoves.find((move) => move.id === slot.chargedOneId) ?? chargedMoves[0]
  const chargedTwo =
    chargedMoves.find((move) => move.id === slot.chargedTwoId && move.id !== chargedOne.id) ??
    chargedMoves.find((move) => move.id !== chargedOne.id) ??
    chargedOne

  return { species, fastMove, chargedMoves: [chargedOne, chargedTwo] }
}

function toPokemonBuild(slot: SlotBuild, level: number): PokemonBuild {
  return {
    species: slot.species,
    level,
    ivs: { attack: 15, defense: 15, stamina: 15 },
    shadow: false,
    bestBuddy: false,
    fastMove: slot.fastMove,
    chargedMoves: slot.chargedMoves,
  }
}

function normalizeChargedPair(slot: SlotState, chargedMoves: ChargedMove[]) {
  if (slot.chargedOneId !== slot.chargedTwoId) {
    return slot
  }
  const replacement = chargedMoves.find((move) => move.id !== slot.chargedOneId)
  return replacement ? { ...slot, chargedTwoId: replacement.id } : slot
}

function legalFastMoves(species: PokemonSpecies, maps: ReturnType<typeof moveMaps>) {
  const moves = species.fastMoves
    .map((id) => maps.fast.get(id))
    .filter((move): move is FastMove => Boolean(move))
  if (moves.length === 0) {
    throw new Error(`${species.name} has no resolvable fast move`)
  }
  return moves
}

function legalChargedMoves(species: PokemonSpecies, maps: ReturnType<typeof moveMaps>) {
  const moves = species.chargedMoves
    .map((id) => maps.charged.get(id))
    .filter((move): move is ChargedMove => Boolean(move))
  if (moves.length < 2) {
    throw new Error(`${species.name} needs at least two charged moves`)
  }
  return moves
}

function fastMoveLabel(move: FastMove) {
  return `${move.name} · ${typeAbbreviation(move.type)} · P${move.power} · +E${move.energyGain} · ${move.turns}T`
}

function chargedMoveLabel(move: ChargedMove) {
  return `${move.name} · ${typeAbbreviation(move.type)} · P${move.power} · E${move.energyCost}`
}

function formatLineupBranch(id: string) {
  return id
    .split(/[-_]/)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}
