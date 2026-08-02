import type { MechanicsSnapshot } from "../../data/schemas/mechanics";
import type { MovesSnapshot } from "../../data/schemas/moves";
import type { PokemonSpecies } from "../../data/schemas/pokemon";
import type { RocketLineup } from "../../data/schemas/rocket";
import type { PokemonBuild } from "../pokemon/types";
import { simulateRocketLineupExperimental } from "./engine";
import type { BattleResult, BattleStrategy } from "./types";

export type LineupEvaluation = {
  lineup: RocketLineup;
  result: BattleResult;
};

export type UniversalPairEvaluation = {
  lead: PokemonBuild;
  backup: PokemonBuild;
  strategy: BattleStrategy;
  totalLineups: number;
  proxyClears: number;
  proxyFailures: number;
  universalProxyClear: boolean;
  confidence: BattleResult["confidence"];
  simulationVersion: string;
  lineupEvaluations: LineupEvaluation[];
  failingLineups: LineupEvaluation[];
};

export function evaluateUniversalPairExperimental({
  lead,
  backup,
  lineups,
  mechanics,
  rocketOpponents,
  moves,
  strategy,
  trainerLevel = lead.level,
}: {
  lead: PokemonBuild;
  backup: PokemonBuild;
  lineups: RocketLineup[];
  mechanics: MechanicsSnapshot;
  rocketOpponents: PokemonSpecies[];
  moves: MovesSnapshot;
  strategy: BattleStrategy;
  trainerLevel?: number;
}): UniversalPairEvaluation {
  const lineupEvaluations = lineups.map((lineup) => ({
    lineup,
    result: simulateRocketLineupExperimental({
      lead,
      backup,
      lineup,
      mechanics,
      rocketOpponents,
      moves,
      strategy,
      trainerLevel,
    }),
  }));
  const failingLineups = lineupEvaluations.filter(
    (evaluation) => evaluation.result.outcome !== "win",
  );
  const firstResult = lineupEvaluations[0]?.result;

  return {
    lead,
    backup,
    strategy,
    totalLineups: lineupEvaluations.length,
    proxyClears: lineupEvaluations.length - failingLineups.length,
    proxyFailures: failingLineups.length,
    universalProxyClear:
      lineupEvaluations.length > 0 && failingLineups.length === 0,
    confidence: firstResult?.confidence ?? "not-simulated",
    simulationVersion:
      firstResult?.simulationVersion ?? "m2-experimental-rocket-unknown",
    lineupEvaluations,
    failingLineups,
  };
}
