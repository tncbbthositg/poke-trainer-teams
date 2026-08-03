import type {
  MovesSnapshot,
  ChargedMove,
  FastMove,
} from "../../data/schemas/moves";
import type { PokemonSpecies } from "../../data/schemas/pokemon";
import type { MechanicsSnapshot } from "../../data/schemas/mechanics";
import type { RocketLineup } from "../../data/schemas/rocket";
import type { PokemonBuild } from "../pokemon/types";
import { simulateRocketLineupExperimental } from "../battle/engine";
import type { BattleStrategy } from "../battle/types";
import { analyzeMoveset } from "../moves/analytics";
import { calculateEffectiveStats } from "../stats/effectiveStats";
import { stabMultiplier } from "../types/effectiveness";

export type PokemonFocusStrategy =
  "fastest-victory" | "charged-pause-control" | "practical-spam";

export type FocusMoveset = {
  fastMove: FastMove;
  chargedMoves: [ChargedMove, ChargedMove];
  score: number;
  firstChargeTurns: number;
  repeatChargeTurns: number;
  neutralOutputPerTurn: number;
  fastDamagePerTurn: number;
  fastEnergyPerTurn: number;
  fastMoveTurns: number;
  coverageTypeCount: number;
  cheapChargedMoveCount: number;
  bulkReliability: number;
  selfDebuffMultiplier: number;
};

export type PokemonFocusRanking = {
  species: PokemonSpecies;
  rank: number;
  score: number;
  strategy: PokemonFocusStrategy;
  moveset: FocusMoveset;
  bossProxy?: BossProxyFocus;
  reason: string;
};

export type BossProxyFocus = {
  clears: number;
  total: number;
  failures: number;
  totalTurns: number;
  bestPartner: PokemonSpecies;
  bestRole: "lead" | "backup";
  perfectPartnerCount: number;
  totalPartnerClears: number;
};

export const pokemonFocusStrategyLabels: Record<PokemonFocusStrategy, string> =
  {
    "fastest-victory": "Fastest victory",
    "charged-pause-control": "Charged pause control",
    "practical-spam": "Practical spam",
  };

export const pokemonFocusStrategyNotes: Record<PokemonFocusStrategy, string> = {
  "fastest-victory":
    "Prioritizes neutral damage output, effective attack, short time to the first charged attack, and some fast-move pressure.",
  "charged-pause-control":
    "Prioritizes cheap, repeatable charged attacks, short fast-move cadence, and enough bulk to exploit Rocket pause assumptions.",
  "practical-spam":
    "Prioritizes cheap, repeatable charged attacks, short fast-move cadence, and bulk while penalizing scarce candy and high-value raid attacker overlap.",
};

export function rankPokemonForFocus(
  candidates: PokemonSpecies[],
  moves: MovesSnapshot,
  strategy: PokemonFocusStrategy,
  level = 40,
): PokemonFocusRanking[] {
  return candidates
    .map((species) => {
      const moveset = bestMovesetForStrategy(species, moves, strategy, level);

      return {
        species,
        rank: 0,
        score: moveset.score,
        strategy,
        moveset,
        reason: strategyReason(strategy, moveset),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score || a.species.name.localeCompare(b.species.name),
    )
    .map((ranking, index) => ({ ...ranking, rank: index + 1 }));
}

export function rankPokemonForBossFocus({
  candidates,
  moves,
  lineups,
  mechanics,
  rocketOpponents,
  strategy,
  level = 40,
  trainerLevel = level,
}: {
  candidates: PokemonSpecies[];
  moves: MovesSnapshot;
  lineups: RocketLineup[];
  mechanics: MechanicsSnapshot;
  rocketOpponents: PokemonSpecies[];
  strategy: PokemonFocusStrategy;
  level?: number;
  trainerLevel?: number;
}): PokemonFocusRanking[] {
  const baseRankings = rankPokemonForFocus(candidates, moves, strategy, level);
  const bossLineups = lineups.filter(
    (lineup) =>
      lineup.trainerClass === "leader" || lineup.trainerClass === "giovanni",
  );

  if (bossLineups.length === 0 || strategy === "fastest-victory") {
    return baseRankings;
  }

  const battleStrategy = battleStrategyForFocus(strategy);
  const builds = new Map(
    baseRankings.map((ranking) => [
      ranking.species.id,
      buildForRanking(ranking, level),
    ]),
  );
  const bestBySpeciesId = new Map<string, BossProxyFocus>();

  for (const leadRanking of baseRankings) {
    for (const backupRanking of baseRankings) {
      if (leadRanking.species.id === backupRanking.species.id) {
        continue;
      }

      const lead = builds.get(leadRanking.species.id);
      const backup = builds.get(backupRanking.species.id);
      if (!lead || !backup) {
        continue;
      }

      const pairResult = evaluateBossPair({
        lead,
        backup,
        bossLineups,
        mechanics,
        rocketOpponents,
        moves,
        battleStrategy,
        trainerLevel,
      });

      recordBossProxy(
        bestBySpeciesId,
        leadRanking.species,
        backupRanking.species,
        "lead",
        pairResult,
      );
      recordBossProxy(
        bestBySpeciesId,
        backupRanking.species,
        leadRanking.species,
        "backup",
        pairResult,
      );
    }
  }

  return baseRankings
    .map((ranking) => {
      const bossProxy = bestBySpeciesId.get(ranking.species.id);

      return {
        ...ranking,
        bossProxy,
        reason: bossProxy
          ? bossProxyReason(ranking, bossProxy)
          : ranking.reason,
      };
    })
    .sort(
      (a, b) =>
        (b.bossProxy?.clears ?? 0) - (a.bossProxy?.clears ?? 0) ||
        (b.bossProxy?.perfectPartnerCount ?? 0) -
          (a.bossProxy?.perfectPartnerCount ?? 0) ||
        (b.bossProxy?.totalPartnerClears ?? 0) -
          (a.bossProxy?.totalPartnerClears ?? 0) ||
        (a.bossProxy?.totalTurns ?? Infinity) -
          (b.bossProxy?.totalTurns ?? Infinity) ||
        b.score - a.score ||
        a.species.name.localeCompare(b.species.name),
    )
    .map((ranking, index) => ({ ...ranking, rank: index + 1 }));
}

export function bestMovesetForStrategy(
  species: PokemonSpecies,
  moves: MovesSnapshot,
  strategy: PokemonFocusStrategy,
  level = 40,
): FocusMoveset {
  const fastMoves = legalFastMoves(species, moves);
  const chargedPairs = legalChargedPairs(species, moves);
  if (chargedPairs.length === 0) {
    throw new Error(
      `${species.name} needs at least two resolvable charged moves`,
    );
  }

  const scored = fastMoves.flatMap((fastMove) =>
    chargedPairs.map((chargedMoves) =>
      scoreMoveset(species, fastMove, chargedMoves, strategy, level),
    ),
  );

  return scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.firstChargeTurns - b.firstChargeTurns ||
      b.neutralOutputPerTurn - a.neutralOutputPerTurn,
  )[0];
}

function scoreMoveset(
  species: PokemonSpecies,
  fastMove: FastMove,
  chargedMoves: [ChargedMove, ChargedMove],
  strategy: PokemonFocusStrategy,
  level: number,
): FocusMoveset {
  const stats = calculateEffectiveStats(species, level);
  const analytics = analyzeMoveset(species, fastMove, chargedMoves);
  const bestNeutralOutput = Math.max(
    ...analytics.neutralOutput.map((item) => item.totalPower),
  );
  const neutralOutputPerTurn = bestNeutralOutput / 100;
  const firstChargeTurns = Math.min(
    ...analytics.timings.map((item) => item.firstTurns),
  );
  const repeatChargeTurns = Math.min(
    ...analytics.timings.map((item) => item.repeatTurns),
  );
  const cheapChargedMoveCount = analytics.cheapChargedMoveCount;
  const coverageTypeCount = analytics.coverageTypes.length;
  const pauseFrequency = 100 / Math.max(1, repeatChargeTurns);
  const openingChargeSpeed = 100 / Math.max(1, firstChargeTurns);
  const fastMoveCadence = 100 / fastMove.turns;
  const bulkReliability = Math.sqrt(stats.rawBulkProxy);
  const selfDebuffMultiplier = guaranteedSelfDebuffMultiplier(
    chargedMoves,
    strategy,
  );

  const spamScore =
    openingChargeSpeed * 34 +
    pauseFrequency * 48 +
    fastMoveCadence * 10 +
    cheapChargedMoveCount * 38 +
    coverageTypeCount * 8 +
    bulkReliability * 2.4 +
    stats.attack * neutralOutputPerTurn * 0.08;

  const baseScore =
    strategy === "fastest-victory"
      ? stats.attack * neutralOutputPerTurn * 1.08 +
        analytics.fast.damagePerTurn * stats.attack * 0.06 +
        fastMoveCadence * 2 +
        openingChargeSpeed * 16 +
        coverageTypeCount * 12
      : strategy === "practical-spam"
        ? spamScore * practicalAvailabilityMultiplier(species)
        : spamScore;
  const score =
    baseScore *
    selfDebuffMultiplier *
    fastestSurvivabilityMultiplier(stats.rawBulkProxy, strategy) *
    rocketReliabilityMultiplier(species);

  return {
    fastMove,
    chargedMoves: orderRecommendedChargedMoves(species, chargedMoves),
    score,
    firstChargeTurns,
    repeatChargeTurns,
    neutralOutputPerTurn,
    fastDamagePerTurn: analytics.fast.damagePerTurn,
    fastEnergyPerTurn: analytics.fast.energyPerTurn,
    fastMoveTurns: fastMove.turns,
    coverageTypeCount,
    cheapChargedMoveCount,
    bulkReliability,
    selfDebuffMultiplier,
  };
}

function guaranteedSelfDebuffMultiplier(
  chargedMoves: [ChargedMove, ChargedMove],
  strategy: PokemonFocusStrategy,
) {
  return chargedMoves.reduce((multiplier, move) => {
    const debuff = guaranteedSelfDebuffSeverity(move);
    if (debuff === 0) {
      return multiplier;
    }

    const penaltyPerStage = strategy === "fastest-victory" ? 0.12 : 0.18;
    const floor = strategy === "fastest-victory" ? 0.45 : 0.25;
    return multiplier * Math.max(floor, 1 - debuff * penaltyPerStage);
  }, 1);
}

function guaranteedSelfDebuffSeverity(move: ChargedMove) {
  if (
    !move.buffs ||
    move.buffs.chance < 1 ||
    (move.buffs.target !== "self" && move.buffs.target !== "both")
  ) {
    return 0;
  }

  const [attackDelta, defenseDelta] = move.buffs.stages;
  const attackPenalty = Math.max(0, -attackDelta);
  const defensePenalty = Math.max(0, -defenseDelta);

  return attackPenalty + defensePenalty * 1.35;
}

function fastestSurvivabilityMultiplier(
  rawBulkProxy: number,
  strategy: PokemonFocusStrategy,
) {
  if (strategy !== "fastest-victory") {
    return 1;
  }

  return Math.max(0.62, Math.min(1, rawBulkProxy / 26000));
}

function buildForRanking(
  ranking: PokemonFocusRanking,
  level: number,
): PokemonBuild {
  return {
    species: ranking.species,
    level,
    ivs: {
      attack: 15,
      defense: 15,
      stamina: 15,
    },
    shadow: false,
    bestBuddy: false,
    fastMove: ranking.moveset.fastMove,
    chargedMoves: ranking.moveset.chargedMoves,
  };
}

function evaluateBossPair({
  lead,
  backup,
  bossLineups,
  mechanics,
  rocketOpponents,
  moves,
  battleStrategy,
  trainerLevel,
}: {
  lead: PokemonBuild;
  backup: PokemonBuild;
  bossLineups: RocketLineup[];
  mechanics: MechanicsSnapshot;
  rocketOpponents: PokemonSpecies[];
  moves: MovesSnapshot;
  battleStrategy: BattleStrategy;
  trainerLevel: number;
}) {
  return bossLineups.reduce(
    (summary, lineup) => {
      const result = simulateRocketLineupExperimental({
        lead,
        backup,
        lineup,
        mechanics,
        rocketOpponents,
        moves,
        strategy: battleStrategy,
        trainerLevel,
      });

      return {
        clears: summary.clears + (result.outcome === "win" ? 1 : 0),
        total: summary.total + 1,
        totalTurns: summary.totalTurns + result.totalTurns,
      };
    },
    { clears: 0, total: 0, totalTurns: 0 },
  );
}

function recordBossProxy(
  bestBySpeciesId: Map<string, BossProxyFocus>,
  species: PokemonSpecies,
  partner: PokemonSpecies,
  role: "lead" | "backup",
  pairResult: { clears: number; total: number; totalTurns: number },
) {
  const current = bestBySpeciesId.get(species.id);
  const nextPerfectPartnerCount =
    (current?.perfectPartnerCount ?? 0) +
    (pairResult.clears === pairResult.total ? 1 : 0);
  const nextTotalPartnerClears =
    (current?.totalPartnerClears ?? 0) + pairResult.clears;

  if (
    !current ||
    pairResult.clears > current.clears ||
    (pairResult.clears === current.clears &&
      pairResult.totalTurns < current.totalTurns)
  ) {
    bestBySpeciesId.set(species.id, {
      clears: pairResult.clears,
      total: pairResult.total,
      failures: pairResult.total - pairResult.clears,
      totalTurns: pairResult.totalTurns,
      bestPartner: partner,
      bestRole: role,
      perfectPartnerCount: nextPerfectPartnerCount,
      totalPartnerClears: nextTotalPartnerClears,
    });
    return;
  }

  bestBySpeciesId.set(species.id, {
    ...current,
    perfectPartnerCount: nextPerfectPartnerCount,
    totalPartnerClears: nextTotalPartnerClears,
  });
}

function bossProxyReason(
  ranking: PokemonFocusRanking,
  bossProxy: BossProxyFocus,
) {
  const roleText =
    bossProxy.bestRole === "lead"
      ? `as lead with ${bossProxy.bestPartner.name}`
      : `as backup to ${bossProxy.bestPartner.name}`;

  return `${bossProxy.clears}/${bossProxy.total} boss proxy clears ${roleText}; ${ranking.reason}`;
}

function battleStrategyForFocus(
  strategy: PokemonFocusStrategy,
): BattleStrategy {
  return strategy === "charged-pause-control" || strategy === "practical-spam"
    ? "charge-asap"
    : "fastest-expected-knockout";
}

function orderRecommendedChargedMoves(
  species: PokemonSpecies,
  chargedMoves: [ChargedMove, ChargedMove],
): [ChargedMove, ChargedMove] {
  const ordered = chargedMoves.slice().sort((a, b) => {
    const costDifference = a.energyCost - b.energyCost;
    if (costDifference !== 0) {
      return costDifference;
    }

    const dpeDifference =
      chargedMoveDpe(species, b) - chargedMoveDpe(species, a);
    if (dpeDifference !== 0) {
      return dpeDifference;
    }

    return a.name.localeCompare(b.name);
  });

  return [ordered[0], ordered[1]];
}

function chargedMoveDpe(species: PokemonSpecies, chargedMove: ChargedMove) {
  return (
    (chargedMove.power * stabMultiplier(chargedMove.type, species.types)) /
    chargedMove.energyCost
  );
}

function practicalAvailabilityMultiplier(species: PokemonSpecies) {
  let multiplier = 1;

  if (isLegendaryOrMythical(species)) {
    multiplier *= 0.72;
  }

  if (isUltraBeast(species)) {
    multiplier *= 0.76;
  }

  if (species.tags.includes("starter")) {
    multiplier *= 1.08;
  }

  if (hasRaidCandyCompetition(species)) {
    multiplier *= 0.84;
  }

  return multiplier;
}

function rocketReliabilityMultiplier(species: PokemonSpecies) {
  return isRocketUnreliableFieldReport(species) ? 0.45 : 1;
}

export function hasScarceCandyAccess(species: PokemonSpecies) {
  return (
    isLegendaryOrMythical(species) ||
    isUltraBeast(species) ||
    hasRaidCandyCompetition(species)
  );
}

export function hasRocketReliabilityWarning(species: PokemonSpecies) {
  return isRocketUnreliableFieldReport(species);
}

function isLegendaryOrMythical(species: PokemonSpecies) {
  return (
    species.tags.includes("legendary") || species.tags.includes("mythical")
  );
}

function isUltraBeast(species: PokemonSpecies) {
  return species.tags.includes("ultrabeast");
}

function hasRaidCandyCompetition(species: PokemonSpecies) {
  return raidCandyCompetitionSpecies.has(species.id);
}

function isRocketUnreliableFieldReport(species: PokemonSpecies) {
  return species.tags.includes("rocket-unreliable-field-report");
}

const raidCandyCompetitionSpecies = new Set([
  "kartana",
  "palkia",
  "rayquaza",
  "reshiram",
  "dragonite",
  "xurkitree",
  "groudon",
  "terrakion",
  "landorus_therian",
  "zekrom",
  "dialga",
  "dialga_origin",
  "garchomp",
  "lucario",
  "metagross",
  "tyranitar",
  "kyogre",
  "palkia_origin",
  "rhyperior",
  "excadrill",
]);

function legalFastMoves(
  species: PokemonSpecies,
  moves: MovesSnapshot,
): FastMove[] {
  const byId = new Map(moves.fastMoves.map((move) => [move.id, move]));
  return species.fastMoves
    .map((id) => byId.get(id))
    .filter((move): move is FastMove => Boolean(move));
}

function legalChargedPairs(
  species: PokemonSpecies,
  moves: MovesSnapshot,
): Array<[ChargedMove, ChargedMove]> {
  const byId = new Map(moves.chargedMoves.map((move) => [move.id, move]));
  const chargedMoves = species.chargedMoves
    .map((id) => byId.get(id))
    .filter((move): move is ChargedMove => Boolean(move));
  const pairs: Array<[ChargedMove, ChargedMove]> = [];

  for (let first = 0; first < chargedMoves.length; first += 1) {
    for (let second = first + 1; second < chargedMoves.length; second += 1) {
      pairs.push([chargedMoves[first], chargedMoves[second]]);
    }
  }

  return pairs;
}

function strategyReason(
  strategy: PokemonFocusStrategy,
  moveset: FocusMoveset,
): string {
  if (strategy === "fastest-victory") {
    return `${moveset.neutralOutputPerTurn.toFixed(1)} neutral power/turn with first charge in ${moveset.firstChargeTurns} turns`;
  }

  if (strategy === "practical-spam") {
    return `${moveset.cheapChargedMoveCount} cheap charged moves, ${moveset.repeatChargeTurns}-turn repeat pressure, ${moveset.fastMoveTurns}-turn fast cadence, ${selfDebuffReason(moveset)}build-pressure weighted`;
  }

  return `${moveset.cheapChargedMoveCount} cheap charged moves with ${moveset.repeatChargeTurns}-turn repeat pressure, ${moveset.fastMoveTurns}-turn fast cadence, and ${selfDebuffReason(moveset)}Rocket-control reliability`;
}

function selfDebuffReason(moveset: FocusMoveset) {
  return moveset.selfDebuffMultiplier < 1 ? "self-debuff adjusted, " : "";
}
