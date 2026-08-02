import { z } from "zod";

const observedPokemonSchema = z.object({
  speciesId: z.string().min(1),
  level: z.number().min(1).max(51),
  ivs: z.object({
    attack: z.number().int().min(0).max(15),
    defense: z.number().int().min(0).max(15),
    stamina: z.number().int().min(0).max(15),
  }),
  fastMoveId: z.string().min(1),
  chargedMoveIds: z.tuple([z.string().min(1), z.string().min(1)]),
  shadow: z.boolean(),
  bestBuddy: z.boolean(),
});

export const battleObservationSchema = z.object({
  id: z.string().min(1),
  observedAt: z.string().datetime(),
  source: z.object({
    observer: z.string().min(1),
    evidenceUrl: z.string().url().optional(),
    notes: z.string().min(1),
  }),
  lineupId: z.string().min(1),
  strategy: z.string().min(1),
  lead: observedPokemonSchema,
  backup: observedPokemonSchema,
  opponentPokemonIds: z.tuple([
    z.string().min(1),
    z.string().min(1),
    z.string().min(1),
  ]),
  observedOpponentFastMoveIds: z.array(z.string().min(1)).max(3),
  observedOpponentChargedMoveIds: z.array(z.string().min(1)).max(3),
  result: z.object({
    outcome: z.enum(["win", "loss"]),
    battleSeconds: z.number().positive(),
    playerShieldsUsed: z.number().int().min(0).max(2),
    rocketShieldsUsed: z.number().int().min(0).max(2),
    playerFaints: z.number().int().min(0).max(2),
    switches: z.number().int().min(0).max(1),
    finalPlayerPokemonIndex: z.number().int().min(0).max(1),
    finalPlayerHp: z.number().int().min(0),
    finalOpponentPokemonIndex: z.number().int().min(0).max(2),
    finalOpponentHp: z.number().int().min(0),
  }),
  environment: z.object({
    device: z.string().min(1),
    networkNotes: z.string().min(1),
    animationNotes: z.string().min(1),
  }),
});

export const battleObservationSnapshotSchema = z.object({
  schemaVersion: z.string().min(1),
  generatedAt: z.string().min(1),
  observations: z.array(battleObservationSchema),
});

export type BattleObservation = z.infer<typeof battleObservationSchema>;
export type BattleObservationSnapshot = z.infer<
  typeof battleObservationSnapshotSchema
>;
