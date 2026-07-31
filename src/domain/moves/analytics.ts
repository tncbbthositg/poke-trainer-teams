import type { PokemonSpecies } from '../../data/schemas/pokemon'
import type { ChargedMove, FastMove } from '../../data/schemas/moves'
import { hasStab } from '../types/effectiveness'

export type ChargeTiming = {
  chargedMoveId: string
  chargedMoveName: string
  firstFastMoveCount: number
  firstTurns: number
  firstSeconds: number
  repeatFastMoveCount: number
  repeatTurns: number
  repeatSeconds: number
  leftoverEnergyAfterFirst: number
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
  coverageTypes: string[]
  cheapChargedMoveCount: number
  decisionComplexity: 'low' | 'medium' | 'high'
}

export function analyzeFastMove(
  species: PokemonSpecies,
  fastMove: FastMove,
): FastMoveAnalytics {
  return {
    damagePerTurn: fastMove.power / fastMove.turns,
    energyPerTurn: fastMove.energyGain / fastMove.turns,
    durationSeconds: fastMove.turns * 0.5,
    stab: hasStab(fastMove.type, species.types),
  }
}

export function analyzeChargedMove(
  species: PokemonSpecies,
  chargedMove: ChargedMove,
): ChargedMoveAnalytics {
  return {
    damagePerEnergy: chargedMove.power / chargedMove.energyCost,
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
    firstFastMoveCount,
    firstTurns: firstFastMoveCount * fastMove.turns,
    firstSeconds: firstFastMoveCount * fastMove.turns * 0.5,
    repeatFastMoveCount,
    repeatTurns: repeatFastMoveCount * fastMove.turns,
    repeatSeconds: repeatFastMoveCount * fastMove.turns * 0.5,
    leftoverEnergyAfterFirst,
  }
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
