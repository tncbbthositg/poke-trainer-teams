import { z } from 'zod'
import { pokemonTypeSchema } from './pokemon'
import { dataProvenanceSchema } from './provenance'

const buffSchema = z.object({
  target: z.enum(['self', 'opponent', 'both']),
  stages: z.tuple([z.number().int(), z.number().int()]),
  chance: z.number().min(0).max(1),
})

export const fastMoveSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: pokemonTypeSchema,
  power: z.number().nonnegative(),
  energyGain: z.number().positive(),
  turns: z.number().int().positive(),
  cooldownMs: z.number().int().nonnegative(),
  buffs: buffSchema.optional(),
  provenance: dataProvenanceSchema,
})

export const chargedMoveSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: pokemonTypeSchema,
  power: z.number().nonnegative(),
  energyCost: z.number().positive(),
  buffs: buffSchema.optional(),
  provenance: dataProvenanceSchema,
})

export const movesSnapshotSchema = z.object({
  schemaVersion: z.string().min(1),
  generatedAt: z.string().min(1),
  sourceHash: z.string().min(1),
  fastMoves: z.array(fastMoveSchema).min(1),
  chargedMoves: z.array(chargedMoveSchema).min(1),
})

export type FastMove = z.infer<typeof fastMoveSchema>
export type ChargedMove = z.infer<typeof chargedMoveSchema>
export type MovesSnapshot = z.infer<typeof movesSnapshotSchema>
