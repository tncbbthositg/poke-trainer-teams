import type { PokemonType } from '../../data/schemas/pokemon'

export const typeColors: Record<PokemonType, { bg: string; text: string; bar: string }> = {
  bug: { bg: '#91a119', text: '#f8ffd8', bar: '#91a119' },
  dark: { bg: '#5a4a68', text: '#f6efff', bar: '#5a4a68' },
  dragon: { bg: '#096dc4', text: '#eef7ff', bar: '#096dc4' },
  electric: { bg: '#b77900', text: '#fff7d6', bar: '#f4b400' },
  fairy: { bg: '#b84f91', text: '#fff0fa', bar: '#e877bd' },
  fighting: { bg: '#a52b4f', text: '#ffeef3', bar: '#ce416b' },
  fire: { bg: '#c85b00', text: '#fff3e8', bar: '#ff9d55' },
  flying: { bg: '#5276ad', text: '#eef6ff', bar: '#89aae3' },
  ghost: { bg: '#5269ad', text: '#eef2ff', bar: '#5269ad' },
  grass: { bg: '#347c30', text: '#f0fff0', bar: '#63bc5a' },
  ground: { bg: '#9a4e20', text: '#fff2e8', bar: '#d97845' },
  ice: { bg: '#2f8f84', text: '#edfffc', bar: '#73cec0' },
  normal: { bg: '#5f6870', text: '#f8fafc', bar: '#919aa2' },
  poison: { bg: '#7b3d99', text: '#fbf0ff', bar: '#aa6bc8' },
  psychic: { bg: '#c64255', text: '#fff0f2', bar: '#fa7179' },
  rock: { bg: '#796c3c', text: '#fff8dc', bar: '#c5b78c' },
  steel: { bg: '#426f80', text: '#f0fbff', bar: '#5a8ea2' },
  water: { bg: '#2569a8', text: '#eef7ff', bar: '#5090d6' },
}

export function typeColor(type: PokemonType) {
  return typeColors[type]
}
