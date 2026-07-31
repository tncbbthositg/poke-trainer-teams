import type { PokemonType } from '../../data/schemas/pokemon'

const superEffective: Record<PokemonType, PokemonType[]> = {
  normal: [],
  fire: ['bug', 'grass', 'ice', 'steel'],
  water: ['fire', 'ground', 'rock'],
  electric: ['flying', 'water'],
  grass: ['ground', 'rock', 'water'],
  ice: ['dragon', 'flying', 'grass', 'ground'],
  fighting: ['dark', 'ice', 'normal', 'rock', 'steel'],
  poison: ['fairy', 'grass'],
  ground: ['electric', 'fire', 'poison', 'rock', 'steel'],
  flying: ['bug', 'fighting', 'grass'],
  psychic: ['fighting', 'poison'],
  bug: ['dark', 'grass', 'psychic'],
  rock: ['bug', 'fire', 'flying', 'ice'],
  ghost: ['ghost', 'psychic'],
  dragon: ['dragon'],
  dark: ['ghost', 'psychic'],
  steel: ['fairy', 'ice', 'rock'],
  fairy: ['dark', 'dragon', 'fighting'],
}

const resisted: Record<PokemonType, PokemonType[]> = {
  normal: ['rock', 'steel'],
  fire: ['dragon', 'fire', 'rock', 'water'],
  water: ['dragon', 'grass', 'water'],
  electric: ['dragon', 'electric', 'grass'],
  grass: ['bug', 'dragon', 'fire', 'flying', 'grass', 'poison', 'steel'],
  ice: ['fire', 'ice', 'steel', 'water'],
  fighting: ['bug', 'fairy', 'flying', 'poison', 'psychic'],
  poison: ['ghost', 'ground', 'poison', 'rock'],
  ground: ['bug', 'grass'],
  flying: ['electric', 'rock', 'steel'],
  psychic: ['psychic', 'steel'],
  bug: ['fairy', 'fighting', 'fire', 'flying', 'ghost', 'poison', 'steel'],
  rock: ['fighting', 'ground', 'steel'],
  ghost: ['dark'],
  dragon: ['steel'],
  dark: ['dark', 'fairy', 'fighting'],
  steel: ['electric', 'fire', 'steel', 'water'],
  fairy: ['fire', 'poison', 'steel'],
}

const immune: Record<PokemonType, PokemonType[]> = {
  normal: ['ghost'],
  fire: [],
  water: [],
  electric: ['ground'],
  grass: [],
  ice: [],
  fighting: ['ghost'],
  poison: ['steel'],
  ground: ['flying'],
  flying: [],
  psychic: ['dark'],
  bug: [],
  rock: [],
  ghost: ['normal'],
  dragon: ['fairy'],
  dark: [],
  steel: [],
  fairy: [],
}

export function typeEffectiveness(
  attackType: PokemonType,
  defenderTypes: PokemonType[],
): number {
  return defenderTypes.reduce((multiplier, defenderType) => {
    if (immune[attackType].includes(defenderType)) {
      return multiplier * 0.390625
    }
    if (superEffective[attackType].includes(defenderType)) {
      return multiplier * 1.6
    }
    if (resisted[attackType].includes(defenderType)) {
      return multiplier * 0.625
    }
    return multiplier
  }, 1)
}

export function hasStab(moveType: PokemonType, attackerTypes: PokemonType[]) {
  return attackerTypes.includes(moveType)
}

export function stabMultiplier(moveType: PokemonType, attackerTypes: PokemonType[]) {
  return hasStab(moveType, attackerTypes) ? 1.2 : 1
}
