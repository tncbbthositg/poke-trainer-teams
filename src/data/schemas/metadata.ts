import { z } from 'zod'
import { dataProvenanceSchema } from './provenance'

export const metadataSnapshotSchema = z.object({
  schemaVersion: z.string().min(1),
  generatedAt: z.string().min(1),
  applicationName: z.string().min(1),
  dataSummary: z.object({
    pokemonCount: z.number().int().nonnegative(),
    fastMoveCount: z.number().int().nonnegative(),
    chargedMoveCount: z.number().int().nonnegative(),
    rocketLineupCount: z.number().int().nonnegative(),
  }),
  sources: z.array(dataProvenanceSchema).min(1),
  limitations: z.array(z.string().min(1)).min(1),
})

export type MetadataSnapshot = z.infer<typeof metadataSnapshotSchema>
