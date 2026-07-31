import type { PokemonType } from '../../data/schemas/pokemon'

export function typeLabel(type: PokemonType) {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function typeAbbreviation(type: PokemonType) {
  const abbreviations: Record<PokemonType, string> = {
    bug: 'Bug',
    dark: 'Dark',
    dragon: 'Drg',
    electric: 'Elec',
    fairy: 'Fairy',
    fighting: 'Fight',
    fire: 'Fire',
    flying: 'Fly',
    ghost: 'Ghost',
    grass: 'Grass',
    ground: 'Gnd',
    ice: 'Ice',
    normal: 'Norm',
    poison: 'Pois',
    psychic: 'Psych',
    rock: 'Rock',
    steel: 'Steel',
    water: 'Water',
  }

  return abbreviations[type]
}
