import type { MovesSnapshot, ChargedMove, FastMove } from '../../data/schemas/moves'
import type { PokemonSpecies } from '../../data/schemas/pokemon'
import { analyzeMoveset } from '../moves/analytics'
import { calculateEffectiveStats } from '../stats/effectiveStats'
import { stabMultiplier } from '../types/effectiveness'

export type PokemonFocusStrategy = 'fastest-victory' | 'charged-pause-control'

export type FocusMoveset = {
  fastMove: FastMove
  chargedMoves: [ChargedMove, ChargedMove]
  score: number
  firstChargeTurns: number
  repeatChargeTurns: number
  neutralOutputPerTurn: number
  fastDamagePerTurn: number
  fastEnergyPerTurn: number
  coverageTypeCount: number
  cheapChargedMoveCount: number
}

export type PokemonFocusRanking = {
  species: PokemonSpecies
  rank: number
  score: number
  strategy: PokemonFocusStrategy
  moveset: FocusMoveset
  reason: string
}

export const pokemonFocusStrategyLabels: Record<PokemonFocusStrategy, string> = {
  'fastest-victory': 'Fastest victory',
  'charged-pause-control': 'Charged pause control',
}

export const pokemonFocusStrategyNotes: Record<PokemonFocusStrategy, string> = {
  'fastest-victory':
    'Prioritizes neutral damage output, effective attack, fast move pressure, and short time to the first charged attack.',
  'charged-pause-control':
    'Prioritizes cheap, repeatable charged attacks that can lean on Rocket post-charged-attack pause assumptions.',
}

export function rankPokemonForFocus(
  candidates: PokemonSpecies[],
  moves: MovesSnapshot,
  strategy: PokemonFocusStrategy,
  level = 40,
): PokemonFocusRanking[] {
  return candidates
    .map((species) => {
      const moveset = bestMovesetForStrategy(species, moves, strategy, level)

      return {
        species,
        rank: 0,
        score: moveset.score,
        strategy,
        moveset,
        reason: strategyReason(strategy, moveset),
      }
    })
    .sort((a, b) => b.score - a.score || a.species.name.localeCompare(b.species.name))
    .map((ranking, index) => ({ ...ranking, rank: index + 1 }))
}

export function bestMovesetForStrategy(
  species: PokemonSpecies,
  moves: MovesSnapshot,
  strategy: PokemonFocusStrategy,
  level = 40,
): FocusMoveset {
  const fastMoves = legalFastMoves(species, moves)
  const chargedPairs = legalChargedPairs(species, moves)
  if (chargedPairs.length === 0) {
    throw new Error(`${species.name} needs at least two resolvable charged moves`)
  }

  const scored = fastMoves.flatMap((fastMove) =>
    chargedPairs.map((chargedMoves) =>
      scoreMoveset(species, fastMove, chargedMoves, strategy, level),
    ),
  )

  return scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.firstChargeTurns - b.firstChargeTurns ||
      b.neutralOutputPerTurn - a.neutralOutputPerTurn,
  )[0]
}

function scoreMoveset(
  species: PokemonSpecies,
  fastMove: FastMove,
  chargedMoves: [ChargedMove, ChargedMove],
  strategy: PokemonFocusStrategy,
  level: number,
): FocusMoveset {
  const stats = calculateEffectiveStats(species, level)
  const analytics = analyzeMoveset(species, fastMove, chargedMoves)
  const bestNeutralOutput = Math.max(...analytics.neutralOutput.map((item) => item.totalPower))
  const neutralOutputPerTurn = bestNeutralOutput / 100
  const firstChargeTurns = Math.min(...analytics.timings.map((item) => item.firstTurns))
  const repeatChargeTurns = Math.min(...analytics.timings.map((item) => item.repeatTurns))
  const cheapChargedMoveCount = analytics.cheapChargedMoveCount
  const coverageTypeCount = analytics.coverageTypes.length
  const pauseFrequency = 100 / Math.max(1, repeatChargeTurns)
  const openingChargeSpeed = 100 / Math.max(1, firstChargeTurns)

  const score =
    strategy === 'fastest-victory'
      ? stats.attack * neutralOutputPerTurn +
        analytics.fast.damagePerTurn * stats.attack * 0.5 +
        openingChargeSpeed * 16 +
        coverageTypeCount * 12
      : openingChargeSpeed * 30 +
        pauseFrequency * 34 +
        cheapChargedMoveCount * 32 +
        coverageTypeCount * 10 +
        stats.attack * neutralOutputPerTurn * 0.35

  return {
    fastMove,
    chargedMoves: orderRecommendedChargedMoves(species, chargedMoves),
    score,
    firstChargeTurns,
    repeatChargeTurns,
    neutralOutputPerTurn,
    fastDamagePerTurn: analytics.fast.damagePerTurn,
    fastEnergyPerTurn: analytics.fast.energyPerTurn,
    coverageTypeCount,
    cheapChargedMoveCount,
  }
}

function orderRecommendedChargedMoves(
  species: PokemonSpecies,
  chargedMoves: [ChargedMove, ChargedMove],
): [ChargedMove, ChargedMove] {
  const ordered = chargedMoves.slice().sort((a, b) => {
    const costDifference = a.energyCost - b.energyCost
    if (costDifference !== 0) {
      return costDifference
    }

    const dpeDifference = chargedMoveDpe(species, b) - chargedMoveDpe(species, a)
    if (dpeDifference !== 0) {
      return dpeDifference
    }

    return a.name.localeCompare(b.name)
  })

  return [ordered[0], ordered[1]]
}

function chargedMoveDpe(species: PokemonSpecies, chargedMove: ChargedMove) {
  return (chargedMove.power * stabMultiplier(chargedMove.type, species.types)) / chargedMove.energyCost
}

function legalFastMoves(species: PokemonSpecies, moves: MovesSnapshot): FastMove[] {
  const byId = new Map(moves.fastMoves.map((move) => [move.id, move]))
  return species.fastMoves.map((id) => byId.get(id)).filter((move): move is FastMove => Boolean(move))
}

function legalChargedPairs(
  species: PokemonSpecies,
  moves: MovesSnapshot,
): Array<[ChargedMove, ChargedMove]> {
  const byId = new Map(moves.chargedMoves.map((move) => [move.id, move]))
  const chargedMoves = species.chargedMoves
    .map((id) => byId.get(id))
    .filter((move): move is ChargedMove => Boolean(move))
  const pairs: Array<[ChargedMove, ChargedMove]> = []

  for (let first = 0; first < chargedMoves.length; first += 1) {
    for (let second = first + 1; second < chargedMoves.length; second += 1) {
      pairs.push([chargedMoves[first], chargedMoves[second]])
    }
  }

  return pairs
}

function strategyReason(strategy: PokemonFocusStrategy, moveset: FocusMoveset): string {
  if (strategy === 'fastest-victory') {
    return `${moveset.neutralOutputPerTurn.toFixed(1)} neutral power/turn with first charge in ${moveset.firstChargeTurns} turns`
  }

  return `${moveset.cheapChargedMoveCount} cheap charged moves with ${moveset.repeatChargeTurns}-turn repeat pressure`
}
