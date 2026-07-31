import { z } from 'zod'
import { provenanceCategorySchema } from './provenance'

export const mechanicsValueSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.number(),
  unit: z.string().min(1),
  category: provenanceCategorySchema,
  note: z.string().min(1),
})

export const mechanicsSnapshotSchema = z.object({
  schemaVersion: z.string().min(1),
  generatedAt: z.string().min(1),
  simulationVersion: z.string().min(1),
  values: z.array(mechanicsValueSchema).min(1),
})

export type MechanicsValue = z.infer<typeof mechanicsValueSchema>
export type MechanicsSnapshot = z.infer<typeof mechanicsSnapshotSchema>
