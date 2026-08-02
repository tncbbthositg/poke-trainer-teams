import type { RocketLineup } from "../../data/schemas/rocket";
import type { PokemonSpecies } from "../../data/schemas/pokemon";

export type RocketEffectiveStats = {
  cp: number;
  attack: number;
  defense: number;
  hp: number;
};

const ROCKET_PACKET_CAPTURE_CPM = 0.85374104;

const rocketDifficultyMultiplierByTrainerLevel = {
  8: 0.36566746,
  9: 0.38413203,
  10: 0.40259659,
  11: 0.42106116,
  12: 0.43952573,
  13: 0.4579903,
  14: 0.47645487,
  15: 0.49491943,
  16: 0.513384,
  17: 0.53184857,
  18: 0.55031314,
  19: 0.56877771,
  20: 0.58724227,
  21: 0.60570684,
  22: 0.62417141,
  23: 0.64263598,
  24: 0.66110055,
  25: 0.67956512,
  26: 0.69802968,
  27: 0.71649425,
  28: 0.73495882,
  29: 0.75342339,
  30: 0.77188796,
  31: 0.79035252,
  32: 0.80881709,
  33: 0.82728166,
  34: 0.84574623,
  35: 0.8642108,
  36: 0.88267536,
  37: 0.90113993,
  38: 0.9196045,
  39: 0.93806907,
  40: 0.95653364,
  41: 0.96307086,
  42: 0.9671741,
  43: 0.97127734,
  44: 0.97538058,
  45: 0.97948381,
  46: 0.98358705,
  47: 0.98769029,
  48: 0.99179353,
  49: 0.99589676,
  50: 1,
} as const;

type RocketTrainerClass = RocketLineup["trainerClass"];
type RocketLevel = keyof typeof rocketDifficultyMultiplierByTrainerLevel;

export function calculateRocketEffectiveStats({
  species,
  trainerLevel,
  trainerClass,
}: {
  species: PokemonSpecies;
  trainerLevel: number;
  trainerClass: RocketTrainerClass;
}): RocketEffectiveStats {
  const rCpm =
    rocketDifficultyMultiplierByTrainerLevel[rocketLevel(trainerLevel)] *
    ROCKET_PACKET_CAPTURE_CPM;
  const rankMultiplier = rocketRankMultiplier(trainerClass);
  const attackIv = Math.floor((2 / 3) * species.baseStats.attack + 25);
  const attack =
    2 * (species.baseStats.attack + attackIv) * rCpm * rankMultiplier;
  const defense =
    0.8 * (species.baseStats.defense + 15) * rCpm * rankMultiplier;
  const stamina =
    1.1 * (species.baseStats.stamina + 9) * rCpm * rankMultiplier;
  const hp = Math.max(10, Math.floor(stamina));
  const cp = Math.max(
    10,
    Math.floor((attack * Math.sqrt(defense) * Math.sqrt(stamina)) / 10),
  );

  return {
    cp,
    attack,
    defense,
    hp,
  };
}

function rocketLevel(level: number): RocketLevel {
  return Math.min(50, Math.max(8, Math.round(level))) as RocketLevel;
}

function rocketRankMultiplier(trainerClass: RocketTrainerClass) {
  if (trainerClass === "giovanni") {
    return 1.15;
  }

  if (trainerClass === "leader") {
    return 1.05;
  }

  return 1;
}
