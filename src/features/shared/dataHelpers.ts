import type { ApplicationData } from '../../data/loaders'
import type { ChargedMove, FastMove } from '../../data/schemas/moves'
import type { PokemonSpecies } from '../../data/schemas/pokemon'

export function moveMaps(data: ApplicationData) {
  return {
    fast: new Map(data.moves.fastMoves.map((move) => [move.id, move])),
    charged: new Map(data.moves.chargedMoves.map((move) => [move.id, move])),
  }
}

export function firstLegalMoves(
  species: PokemonSpecies,
  data: ApplicationData,
): { fastMove: FastMove; chargedMoves: [ChargedMove, ChargedMove] } {
  const maps = moveMaps(data)
  const fastMove = maps.fast.get(species.fastMoves[0])
  if (!fastMove) {
    throw new Error(`${species.name} has no resolvable fast move`)
  }
  const chargedMoves = species.chargedMoves
    .map((id) => maps.charged.get(id))
    .filter((move): move is ChargedMove => Boolean(move))
  if (chargedMoves.length < 2) {
    throw new Error(`${species.name} needs at least two charged moves`)
  }
  return { fastMove, chargedMoves: [chargedMoves[0], chargedMoves[1]] }
}

export function chargedPairs(species: PokemonSpecies, data: ApplicationData) {
  const maps = moveMaps(data)
  const moves = species.chargedMoves
    .map((id) => maps.charged.get(id))
    .filter((move): move is ChargedMove => Boolean(move))
  const pairs: Array<[ChargedMove, ChargedMove]> = []
  for (let i = 0; i < moves.length; i += 1) {
    for (let j = i + 1; j < moves.length; j += 1) {
      pairs.push([moves[i], moves[j]])
    }
  }
  return pairs
}
