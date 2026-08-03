import type { RocketLineup } from "../../data/schemas/rocket";
import type { PokemonSpecies } from "../../data/schemas/pokemon";

export type RocketEffectiveStats = {
  cp: number;
  attackIv: number;
  attack: number;
  defense: number;
  stamina: number;
  hp: number;
};

// Rocket stat formula sources:
// - March 2023 IV/stat research: https://www.reddit.com/r/TheSilphRoad/comments/122pfk8/current_team_rocket_cp_formula_march_2023/
// - Level 8-80 rCPM list: https://www.reddit.com/r/TheSilphRoad/comments/1puc05x/cpmr_list_for_level_80_update_and_more_indepth/
export const ROCKET_CPM_DECIMALS = [
  0.299, 0.352, 0.4, 0.444, 0.487, 0.529, 0.569, 0.608, 0.646, 0.683, 0.712,
  0.755, 0.796, 0.808, 0.82, 0.832, 0.844, 0.855, 0.867, 0.878, 0.89, 0.901,
  0.912, 0.923, 0.934, 0.945, 0.955, 0.965, 0.976, 0.986, 0.997, 1.007,
  1.016, 1.026, 1.036, 1.046, 1.056, 1.065, 1.075, 1.084, 1.093, 1.102,
  1.111, 1.12, 1.128, 1.137, 1.145, 1.153, 1.161, 1.168, 1.176, 1.184,
  1.191, 1.199, 1.206, 1.214, 1.221, 1.229, 1.236, 1.243, 1.251, 1.258,
  1.265, 1.27, 1.275, 1.28, 1.285, 1.29, 1.295, 1.3, 1.305, 1.31, 1.315,
] as const;

type RocketTrainerClass = RocketLineup["trainerClass"];

export function calculateRocketEffectiveStats({
  species,
  trainerLevel,
  trainerClass,
}: {
  species: PokemonSpecies;
  trainerLevel: number;
  trainerClass: RocketTrainerClass;
}): RocketEffectiveStats {
  const rCpm = getRocketCpm(trainerLevel);
  const rankMultiplier = rocketRankMultiplier(trainerClass);
  const attackIv = Math.floor((2 / 3) * species.baseStats.attack + 25);
  const attack =
    (species.baseStats.attack + attackIv) * rCpm * rankMultiplier;
  const defense = (species.baseStats.defense + 15) * rCpm * rankMultiplier;
  const stamina =
    Math.floor(0.6 * (species.baseStats.stamina + 15)) *
    rCpm *
    rankMultiplier;
  const hp = Math.floor(stamina);
  const cp = Math.floor(
    (attack * Math.sqrt(defense) * Math.sqrt(stamina)) / 10,
  );

  return {
    cp,
    attackIv,
    attack,
    defense,
    stamina,
    hp,
  };
}

export function getRocketCpm(trainerLevel: number): number {
  if (
    !Number.isInteger(trainerLevel) ||
    trainerLevel < 8 ||
    trainerLevel > 80
  ) {
    throw new RangeError("Trainer level must be 8 through 80");
  }

  return Math.fround(ROCKET_CPM_DECIMALS[trainerLevel - 8]);
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
