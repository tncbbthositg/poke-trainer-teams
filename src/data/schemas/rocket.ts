import { z } from 'zod'
import { dataProvenanceSchema } from './provenance'

export const rocketPokemonSlotSchema = z.object({
  slot: z.number().int().min(1).max(3),
  pokemonIds: z.array(z.string().min(1)).min(1),
})

export const sourceAgreementSchema = z.enum([
  'verified-agreement',
  'single-source',
  'disputed',
  'unverified',
])

export const rocketLineupSchema = z.object({
  id: z.string().min(1),
  trainerName: z.string().min(1),
  trainerClass: z.enum(['grunt', 'leader', 'giovanni', 'decoy']),
  quote: z.string().optional(),
  effectiveDate: z.string().min(1),
  sourceAgreement: sourceAgreementSchema,
  slots: z.array(rocketPokemonSlotSchema).length(3),
  provenance: z.array(dataProvenanceSchema).min(1),
  notes: z.string().min(1),
})

export const rocketLineupSnapshotSchema = z.object({
  schemaVersion: z.string().min(1),
  generatedAt: z.string().min(1),
  effectiveDate: z.string().min(1),
  sourceHash: z.string().min(1),
  lineups: z.array(rocketLineupSchema).min(1),
})

export type RocketLineup = z.infer<typeof rocketLineupSchema>
export type RocketLineupSnapshot = z.infer<typeof rocketLineupSnapshotSchema>
