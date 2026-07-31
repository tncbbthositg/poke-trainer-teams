import type { PokemonSpecies } from '../../data/schemas/pokemon'
import type { ChargedMove, FastMove } from '../../data/schemas/moves'
import type { PokemonType } from '../../data/schemas/pokemon'
import { hasStab, stabMultiplier } from '../types/effectiveness'

export type ChargeTiming = {
  chargedMoveId: string
  chargedMoveName: string
  chargedMoveType: PokemonType
  firstFastMoveCount: number
  firstTurns: number
  firstSeconds: number
  repeatFastMoveCount: number
  repeatTurns: number
  repeatSeconds: number
  leftoverEnergyAfterFirst: number
}

export type NeutralOutput = {
  chargedMoveId: string
  chargedMoveName: string
  chargedMoveType: PokemonType
  chargedMoveHasStab: boolean
  fastMoveHasStab: boolean
  fastMoveUses: number
  chargedMoveUses: number
  totalPower: number
  budgetTurns: number
  includesStab: boolean
}

export type OutputTimelineEvent = {
  turnStart: number
  turnEnd: number
  cumulativePower: number
  addedPower: number
  moveName: string
  moveType: PokemonType
  kind: 'fast' | 'charged'
}

export type FastMoveAnalytics = {
  damagePerTurn: number
  energyPerTurn: number
  durationSeconds: number
  stab: boolean
}

export type ChargedMoveAnalytics = {
  damagePerEnergy: number
  stab: boolean
}

export type MoveSetAnalytics = {
  fast: FastMoveAnalytics
  charged: ChargedMoveAnalytics[]
  timings: ChargeTiming[]
  neutralOutput: NeutralOutput[]
  outputTimelines: OutputTimelineEvent[][]
  coverageTypes: string[]
  cheapChargedMoveCount: number
  decisionComplexity: 'low' | 'medium' | 'high'
}

export function analyzeFastMove(
  species: PokemonSpecies,
  fastMove: FastMove,
): FastMoveAnalytics {
  const damageMultiplier = stabMultiplier(fastMove.type, species.types)

  return {
    damagePerTurn: (fastMove.power * damageMultiplier) / fastMove.turns,
    energyPerTurn: fastMove.energyGain / fastMove.turns,
    durationSeconds: fastMove.turns * 0.5,
    stab: hasStab(fastMove.type, species.types),
  }
}

export function analyzeChargedMove(
  species: PokemonSpecies,
  chargedMove: ChargedMove,
): ChargedMoveAnalytics {
  const damageMultiplier = stabMultiplier(chargedMove.type, species.types)

  return {
    damagePerEnergy: (chargedMove.power * damageMultiplier) / chargedMove.energyCost,
    stab: hasStab(chargedMove.type, species.types),
  }
}

export function chargeTiming(
  fastMove: FastMove,
  chargedMove: ChargedMove,
  startingEnergy = 0,
): ChargeTiming {
  const required = Math.max(0, chargedMove.energyCost - startingEnergy)
  const firstFastMoveCount = Math.ceil(required / fastMove.energyGain)
  const energyAfterFirst = startingEnergy + firstFastMoveCount * fastMove.energyGain
  const leftoverEnergyAfterFirst = energyAfterFirst - chargedMove.energyCost
  const repeatRequired = Math.max(0, chargedMove.energyCost - leftoverEnergyAfterFirst)
  const repeatFastMoveCount = Math.ceil(repeatRequired / fastMove.energyGain)

  return {
    chargedMoveId: chargedMove.id,
    chargedMoveName: chargedMove.name,
    chargedMoveType: chargedMove.type,
    firstFastMoveCount,
    firstTurns: firstFastMoveCount * fastMove.turns,
    firstSeconds: firstFastMoveCount * fastMove.turns * 0.5,
    repeatFastMoveCount,
    repeatTurns: repeatFastMoveCount * fastMove.turns,
    repeatSeconds: repeatFastMoveCount * fastMove.turns * 0.5,
    leftoverEnergyAfterFirst,
  }
}

export function neutralOutputPerFastMoveTurns(
  species: PokemonSpecies,
  fastMove: FastMove,
  chargedMove: ChargedMove,
  budgetTurns = 100,
): NeutralOutput {
  const fastMoveUses = Math.floor(budgetTurns / fastMove.turns)
  const generatedEnergy = fastMoveUses * fastMove.energyGain
  const chargedMoveUses = Math.floor(generatedEnergy / chargedMove.energyCost)
  const fastPower = fastMove.power * stabMultiplier(fastMove.type, species.types)
  const chargedPower = chargedMove.power * stabMultiplier(chargedMove.type, species.types)
  const fastMoveHasStab = hasStab(fastMove.type, species.types)
  const chargedMoveHasStab = hasStab(chargedMove.type, species.types)

  return {
    chargedMoveId: chargedMove.id,
    chargedMoveName: chargedMove.name,
    chargedMoveType: chargedMove.type,
    chargedMoveHasStab,
    fastMoveHasStab,
    fastMoveUses,
    chargedMoveUses,
    totalPower: fastMoveUses * fastPower + chargedMoveUses * chargedPower,
    budgetTurns,
    includesStab: true,
  }
}

export function outputTimelinePerFastMoveTurns(
  species: PokemonSpecies,
  fastMove: FastMove,
  chargedMove: ChargedMove,
  budgetTurns = 100,
): OutputTimelineEvent[] {
  const events: OutputTimelineEvent[] = []
  const fastPower = fastMove.power * stabMultiplier(fastMove.type, species.types)
  const chargedPower = chargedMove.power * stabMultiplier(chargedMove.type, species.types)
  let energy = 0
  let cumulativePower = 0

  for (let turn = 0; turn + fastMove.turns <= budgetTurns; turn += fastMove.turns) {
    energy += fastMove.energyGain
    cumulativePower += fastPower
    events.push({
      turnStart: turn,
      turnEnd: turn + fastMove.turns,
      cumulativePower,
      addedPower: fastPower,
      moveName: fastMove.name,
      moveType: fastMove.type,
      kind: 'fast',
    })

    while (energy >= chargedMove.energyCost) {
      energy -= chargedMove.energyCost
      cumulativePower += chargedPower
      events.push({
        turnStart: turn + fastMove.turns,
        turnEnd: turn + fastMove.turns,
        cumulativePower,
        addedPower: chargedPower,
        moveName: chargedMove.name,
        moveType: chargedMove.type,
        kind: 'charged',
      })
    }
  }

  return events
}

export function analyzeMoveset(
  species: PokemonSpecies,
  fastMove: FastMove,
  chargedMoves: ChargedMove[],
): MoveSetAnalytics {
  const coverageTypes = Array.from(
    new Set([fastMove.type, ...chargedMoves.map((move) => move.type)]),
  )
  const cheapChargedMoveCount = chargedMoves.filter((move) => move.energyCost <= 45).length

  return {
    fast: analyzeFastMove(species, fastMove),
    charged: chargedMoves.map((move) => analyzeChargedMove(species, move)),
    timings: chargedMoves.map((move) => chargeTiming(fastMove, move)),
    neutralOutput: chargedMoves.map((move) =>
      neutralOutputPerFastMoveTurns(species, fastMove, move),
    ),
    outputTimelines: chargedMoves.map((move) =>
      outputTimelinePerFastMoveTurns(species, fastMove, move),
    ),
    coverageTypes,
    cheapChargedMoveCount,
    decisionComplexity:
      coverageTypes.length >= 3 && cheapChargedMoveCount >= 2
        ? 'high'
        : chargedMoves.length > 1
          ? 'medium'
          : 'low',
  }
}
