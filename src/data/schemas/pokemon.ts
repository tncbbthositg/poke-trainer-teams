import { z } from 'zod'
import { dataProvenanceSchema } from './provenance'

export const pokemonTypeSchema = z.enum([
  'bug',
  'dark',
  'dragon',
  'electric',
  'fairy',
  'fighting',
  'fire',
  'flying',
  'ghost',
  'grass',
  'ground',
  'ice',
  'normal',
  'poison',
  'psychic',
  'rock',
  'steel',
  'water',
])

export const baseStatsSchema = z.object({
  attack: z.number().positive(),
  defense: z.number().positive(),
  stamina: z.number().positive(),
})

export const pokemonSpeciesSchema = z.object({
  id: z.string().min(1),
  dex: z.number().int().positive(),
  name: z.string().min(1),
  types: z.array(pokemonTypeSchema).min(1).max(2),
  baseStats: baseStatsSchema,
  fastMoves: z.array(z.string().min(1)).min(1),
  chargedMoves: z.array(z.string().min(1)).min(1),
  tags: z.array(z.string()).default([]),
  provenance: dataProvenanceSchema,
})

export const pokemonSnapshotSchema = z.object({
  schemaVersion: z.string().min(1),
  generatedAt: z.string().min(1),
  sourceHash: z.string().min(1),
  candidates: z.array(pokemonSpeciesSchema).min(1),
})

export type PokemonType = z.infer<typeof pokemonTypeSchema>
export type PokemonSpecies = z.infer<typeof pokemonSpeciesSchema>
export type PokemonSnapshot = z.infer<typeof pokemonSnapshotSchema>
