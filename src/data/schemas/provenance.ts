import { z } from 'zod'

export const provenanceCategorySchema = z.enum([
  'sourced',
  'derived',
  'configurable-assumption',
  'unverified',
  'experimental',
])

export const dataProvenanceSchema = z.object({
  sourceName: z.string().min(1),
  sourceUrl: z.string().url(),
  retrievedAt: z.string().min(1),
  sourceVersion: z.string().min(1),
  parserVersion: z.string().min(1),
  license: z.string().min(1),
  category: provenanceCategorySchema,
  notes: z.string().min(1),
})

export type ProvenanceCategory = z.infer<typeof provenanceCategorySchema>
export type DataProvenance = z.infer<typeof dataProvenanceSchema>
