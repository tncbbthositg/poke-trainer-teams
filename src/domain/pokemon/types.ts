import type { PokemonSpecies } from '../../data/schemas/pokemon'
import type { FastMove, ChargedMove } from '../../data/schemas/moves'

export type PokemonBuild = {
  species: PokemonSpecies
  level: number
  ivs: {
    attack: number
    defense: number
    stamina: number
  }
  shadow: boolean
  bestBuddy: boolean
  fastMove: FastMove
  chargedMoves: [ChargedMove, ChargedMove]
}

export type EffectiveStats = {
  cp: number
  attack: number
  defense: number
  hp: number
  rawBulkProxy: number
}
