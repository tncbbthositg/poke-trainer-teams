import type { PokemonSpecies } from '../../data/schemas/pokemon'
import type { EffectiveStats } from '../pokemon/types'
import { getCpMultiplier } from './cpMultipliers'

export function calculateEffectiveStats(
  species: PokemonSpecies,
  level: number,
  ivs = { attack: 15, defense: 15, stamina: 15 },
): EffectiveStats {
  const cpm = getCpMultiplier(level)
  const attack = (species.baseStats.attack + ivs.attack) * cpm
  const defense = (species.baseStats.defense + ivs.defense) * cpm
  const stamina = (species.baseStats.stamina + ivs.stamina) * cpm
  const hp = Math.max(10, Math.floor(stamina))
  const cp = Math.max(
    10,
    Math.floor((attack * Math.sqrt(defense) * Math.sqrt(stamina)) / 10),
  )

  return {
    cp,
    attack,
    defense,
    hp,
    rawBulkProxy: defense * hp,
  }
}
