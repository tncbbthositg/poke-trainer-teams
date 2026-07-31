import { useMemo, useState } from 'react'
import { Badge } from '../../components/atoms/Badge'
import { MetricBar } from '../../components/atoms/MetricBar'
import { TypeChip, TypeChipList } from '../../components/atoms/TypeChip'
import { typeAbbreviation } from '../../components/atoms/typeLabels'
import { DataSelect } from '../../components/molecules/DataSelect'
import { Panel, PanelHeader } from '../../components/molecules/Panel'
import type { ApplicationData } from '../../data/loaders'
import type { ChargedMove, FastMove } from '../../data/schemas/moves'
import type { PokemonSpecies } from '../../data/schemas/pokemon'
import { createNotSimulatedResult } from '../../domain/battle/engine'
import { analyzeMoveset } from '../../domain/moves/analytics'
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
  const [strategy, setStrategy] = useState('charge-asap')
  const [leadSlot, setLeadSlot] = useState(() => initialSlot(data.pokemon.candidates[0], data))
  const [backupSlot, setBackupSlot] = useState(() => initialSlot(data.pokemon.candidates[1], data))
  const result = useMemo(
    () => createNotSimulatedResult('Rocket simulator is deferred to Milestone 2.'),
    [],
  )
  const lead = resolveSlot(leadSlot, data, maps)
  const backup = resolveSlot(backupSlot, data, maps)

  return (
    <div className="grid gap-4">
      <Panel>
        <PanelHeader
          title="Battle Team Builder"
          subtitle="Pick the two Pokemon and movesets for the ordered Rocket pair. Third slot remains outside calculations."
          right={<Badge tone="warning">No ranking claim</Badge>}
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
            onChange={setStrategy}
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
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="danger">Battle outcome not simulated</Badge>
          <Badge tone="info">{lead.species.name} lead</Badge>
          <Badge tone="info">{backup.species.name} backup</Badge>
        </div>
        <p className="mt-3 text-sm text-[rgb(var(--muted-foreground))]">
          {result.events[0].message} This view now captures the intended team and movesets, but win/loss evaluation remains blocked until Rocket opponent mechanics are implemented.
        </p>
      </Panel>
    </div>
  )
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
