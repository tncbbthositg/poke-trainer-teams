import type { PokemonBuild } from "../pokemon/types";
import type { PokemonType } from "../../data/schemas/pokemon";

export type BattleStrategy =
  | "charge-asap"
  | "fastest-expected-knockout"
  | "shield-breaker"
  | "preserve-lead"
  | "minimal-interaction";

export type BattleOutcome =
  "win" | "loss" | "third-slot-required" | "not-simulated";

export type BattleEvent = {
  turn: number;
  wallClockSeconds: number;
  actor: "player" | "rocket" | "system";
  kind:
    | "pokemon-enter"
    | "fast-start"
    | "fast-resolve"
    | "charged-attack"
    | "shield"
    | "buff"
    | "faint"
    | "switch"
    | "pause"
    | "battle-end";
  message: string;
  moveType?: PokemonType;
  attack?: {
    name: string;
    baseDamage: number;
    stabBonus: number;
    typeBonus: number;
    totalDamage: number;
    stabMultiplier: number;
    typeMultiplier: number;
  };
  durationTurns?: number;
  playerHp?: number;
  playerMaxHp?: number;
  playerTypes?: PokemonType[];
  opponentHp?: number;
  opponentMaxHp?: number;
  opponentTypes?: PokemonType[];
};

export type BattleResult = {
  outcome: BattleOutcome;
  totalTurns: number;
  wallClockSeconds: number;
  pokemonUsed: number;
  pokemonFainted: number;
  shieldsUsed: number;
  chargedAttacksUsed: number;
  fastAttacksUsed: number;
  switches: number;
  playerDecisions: number;
  assumptionsUsed: string[];
  simulationVersion: string;
  events: BattleEvent[];
};

export type PairEvaluation = {
  lead: PokemonBuild;
  backup: PokemonBuild;
  strategy: BattleStrategy;
  result: BattleResult;
};
