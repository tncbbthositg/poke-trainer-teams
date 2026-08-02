import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import {
  rankPokemonForFocus,
  type PokemonFocusStrategy,
} from "../../src/domain/ranking/pokemonFocus";
import type { MovesSnapshot } from "../../src/data/schemas/moves";
import {
  pokemonTypeSchema,
  type PokemonSpecies,
  type PokemonType,
} from "../../src/data/schemas/pokemon";
import type { DataProvenance } from "../../src/data/schemas/provenance";
import { sha256, nowIso } from "./shared";

const pvpokeUrl =
  "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json";
const parserVersion = "pvpoke-normalizer-0.1.0";
const seedCandidates = [
  { sourceId: "kingambit", displayName: "Kingambit" },
  { sourceId: "annihilape", displayName: "Annihilape" },
  { sourceId: "lucario", displayName: "Lucario" },
  { sourceId: "terrakion", displayName: "Terrakion" },
  { sourceId: "swampert", displayName: "Swampert" },
  { sourceId: "groudon", displayName: "Groudon" },
  { sourceId: "mewtwo", displayName: "Mewtwo" },
  { sourceId: "melmetal", displayName: "Melmetal" },
  {
    sourceId: "morpeko_full_belly",
    displayName: "Morpeko",
    extraTags: ["rocket-unreliable-field-report"],
    note: "PvPoke models Morpeko as form-specific entries; Full Belly is the display form. Live Rocket field report on 2026-08-01 indicates the Morpeko shortcut is unreliable; Aura Wheel alternates by form in battle and Morpeko is treated as Rocket-unreliable until validated.",
  },
  { sourceId: "greninja", displayName: "Greninja" },
  { sourceId: "dragonite", displayName: "Dragonite" },
  { sourceId: "garchomp", displayName: "Garchomp" },
  { sourceId: "togekiss", displayName: "Togekiss" },
  { sourceId: "metagross", displayName: "Metagross" },
  { sourceId: "excadrill", displayName: "Excadrill" },
  { sourceId: "tyranitar", displayName: "Tyranitar" },
  { sourceId: "machamp", displayName: "Machamp" },
  { sourceId: "rhyperior", displayName: "Rhyperior" },
  { sourceId: "kartana", displayName: "Kartana" },
  { sourceId: "xurkitree", displayName: "Xurkitree" },
  { sourceId: "reshiram", displayName: "Reshiram" },
  { sourceId: "zekrom", displayName: "Zekrom" },
  { sourceId: "kyogre", displayName: "Kyogre" },
  { sourceId: "rayquaza", displayName: "Rayquaza" },
  { sourceId: "dialga", displayName: "Dialga" },
  { sourceId: "dialga_origin", displayName: "Dialga (Origin)" },
  { sourceId: "palkia", displayName: "Palkia" },
  { sourceId: "palkia_origin", displayName: "Palkia (Origin)" },
  { sourceId: "landorus_therian", displayName: "Landorus" },
  { sourceId: "poliwrath", displayName: "Poliwrath" },
  { sourceId: "obstagoon", displayName: "Obstagoon" },
  { sourceId: "charizard", displayName: "Charizard" },
  { sourceId: "venusaur", displayName: "Venusaur" },
  { sourceId: "gyarados", displayName: "Gyarados" },
  { sourceId: "primarina", displayName: "Primarina" },
];
const discoveredCandidatesPerStrategy = 30;
const discoveryStrategies: PokemonFocusStrategy[] = [
  "fastest-victory",
  "charged-pause-control",
  "practical-spam",
];

const rocketOpponentIds = [
  "alakazam",
  "amaura",
  "axew",
  "blastoise",
  "camerupt",
  "charizard",
  "ferrothorn",
  "flygon",
  "gallade",
  "golurk",
  "golem",
  "houndoom",
  "hoothoot",
  "kangaskhan",
  "loudred",
  "machamp",
  "milotic",
  "persian",
  "porygon",
  "reshiram",
  "rhyperior",
  "scizor",
  "slowbro",
  "snorlax",
  "starly",
  "steelix",
  "stufful",
  "swellow",
  "teddiursa",
  "tyranitar",
  "tyrunt",
  "ursaring",
  "weezing_galarian",
];

type PvPokeMove = {
  moveId: string;
  name: string;
  type: string;
  power: number;
  energy?: number;
  energyGain?: number;
  cooldown?: number;
  turns?: number;
  buffs?: [number, number];
  buffTarget?: "self" | "opponent" | "both";
  buffApplyChance?: string | number;
};

type PvPokePokemon = {
  dex: number;
  speciesName: string;
  speciesId: string;
  baseStats: { atk: number; def: number; hp: number };
  types: string[];
  fastMoves: string[];
  chargedMoves: string[];
  tags?: string[];
};

type PvPokeGameMaster = {
  timestamp: string;
  pokemon: PvPokePokemon[];
  moves: PvPokeMove[];
};

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(path, body);
}

async function main() {
  const response = await fetch(pvpokeUrl);
  if (!response.ok) {
    throw new Error(
      `PvPoke fetch failed: ${response.status} ${response.statusText}`,
    );
  }
  const raw = await response.text();
  const sourceHash = sha256(raw);
  const gameMaster = JSON.parse(raw) as PvPokeGameMaster;
  const generatedAt = nowIso();
  const provenance: DataProvenance = {
    sourceName: "PvPoke GameMaster",
    sourceUrl: pvpokeUrl,
    retrievedAt: generatedAt,
    sourceVersion: gameMaster.timestamp,
    parserVersion,
    license:
      "MIT; attribution required in Rocket Pair Lab methodology and README",
    category: "sourced",
    notes:
      "Normalized Trainer Battle data from PvPoke source data; rankings are not imported.",
  };

  const byMoveId = new Map(gameMaster.moves.map((move) => [move.moveId, move]));
  const bySpeciesId = new Map(
    gameMaster.pokemon.map((pokemon) => [pokemon.speciesId, pokemon]),
  );
  const seedBySourceId = new Map(
    seedCandidates.map((candidate) => [candidate.sourceId, candidate]),
  );

  function normalizeSpecies(
    sourceId: string,
    displayName?: string,
    extraTags: string[] = [],
    note?: string,
  ): PokemonSpecies {
    const species = bySpeciesId.get(sourceId);
    if (!species) {
      throw new Error(`Pokemon ${sourceId} not found in PvPoke GameMaster`);
    }
    return {
      id: species.speciesId,
      dex: species.dex,
      name: displayName ?? species.speciesName,
      types: species.types
        .filter((type) => type !== "none")
        .map((type) => normalizePokemonType(type)),
      baseStats: {
        attack: species.baseStats.atk,
        defense: species.baseStats.def,
        stamina: species.baseStats.hp,
      },
      fastMoves: species.fastMoves,
      chargedMoves: species.chargedMoves,
      tags: Array.from(new Set([...(species.tags ?? []), ...extraTags])),
      provenance: note
        ? {
            ...provenance,
            notes: `${provenance.notes} ${note}`,
          }
        : provenance,
    };
  }

  const fastMoves = gameMaster.moves
    .filter((move) => (move.energyGain ?? 0) > 0)
    .map((move) => ({
      id: move.moveId,
      name: move.name,
      type: normalizePokemonType(move.type),
      power: move.power,
      energyGain: move.energyGain ?? 0,
      turns:
        move.turns ?? Math.max(1, Math.round((move.cooldown ?? 500) / 500)),
      cooldownMs: move.cooldown ?? 0,
      buffs: normalizeBuff(move),
      provenance,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const chargedMoves = gameMaster.moves
    .filter((move) => (move.energy ?? 0) > 0)
    .map((move) => ({
      id: move.moveId,
      name: move.name,
      type: normalizePokemonType(move.type),
      power: move.power,
      energyCost: move.energy ?? 0,
      buffs: normalizeBuff(move),
      provenance,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const movesSnapshot: MovesSnapshot = {
    schemaVersion: "1.0.0",
    generatedAt,
    sourceHash,
    fastMoves,
    chargedMoves,
  };

  const eligibleDiscoverySpecies = gameMaster.pokemon
    .filter((species) => isDiscoveryEligible(species, byMoveId))
    .map((species) => normalizeSpecies(species.speciesId));
  const discoveredIds = discoverCandidateIds(
    eligibleDiscoverySpecies,
    movesSnapshot,
  );
  const candidateIds = orderedUnique([
    ...seedCandidates.map((candidate) => candidate.sourceId),
    ...discoveredIds,
  ]);
  const normalizedCandidates = candidateIds.map((sourceId) => {
    const seed = seedBySourceId.get(sourceId);

    return normalizeSpecies(
      sourceId,
      seed?.displayName,
      seed?.extraTags,
      seed?.note,
    );
  });
  const normalizedRocketOpponents = rocketOpponentIds.map((sourceId) =>
    normalizeSpecies(sourceId),
  );

  const pokemonSnapshot = {
    schemaVersion: "1.0.0",
    generatedAt,
    sourceHash,
    candidates: normalizedCandidates,
    rocketOpponents: normalizedRocketOpponents,
  };

  await writeJson("public/data/pokemon.json", pokemonSnapshot);
  await writeJson("public/data/moves.json", movesSnapshot);
  await writeJson("src/data/generated/pokemon.json", pokemonSnapshot);
  await writeJson("src/data/generated/moves.json", movesSnapshot);
  await writeFile(
    "public/data/pvpoke-update-summary.md",
    [
      "# PvPoke Update Summary",
      "",
      `Generated: ${generatedAt}`,
      `Source timestamp: ${gameMaster.timestamp}`,
      `Source hash: ${sourceHash}`,
      `Candidates: ${normalizedCandidates.length}`,
      `Seed candidates: ${seedCandidates.length}`,
      `Discovery-eligible species/forms: ${eligibleDiscoverySpecies.length}`,
      `Discovered candidate limit per strategy: ${discoveredCandidatesPerStrategy}`,
      `Rocket opponents: ${normalizedRocketOpponents.length}`,
      `Fast moves: ${fastMoves.length}`,
      `Charged moves: ${chargedMoves.length}`,
      "",
      "Candidate discovery keeps the hand-picked seed list, then adds the top",
      "high-energy species/forms from each focus strategy. Eligible discovered",
      "species/forms must be non-shadow, non-mega, non-primal, have at least one",
      "fast move with EPT >= 4, at least two charged moves, and at least one",
      "charged move costing 45 energy or less.",
      "",
    ].join("\n"),
  );
}

function normalizeBuff(move: PvPokeMove) {
  if (!move.buffs || !move.buffTarget) {
    return undefined;
  }
  return {
    target: move.buffTarget,
    stages: move.buffs,
    chance: Number(move.buffApplyChance ?? 0),
  };
}

function normalizePokemonType(type: string): PokemonType {
  return pokemonTypeSchema.parse(type);
}

function discoverCandidateIds(
  eligibleSpecies: PokemonSpecies[],
  movesSnapshot: MovesSnapshot,
) {
  const ids = new Set<string>();

  for (const strategy of discoveryStrategies) {
    const rankings = rankPokemonForFocus(
      eligibleSpecies,
      movesSnapshot,
      strategy,
      40,
    );

    for (const ranking of rankings.slice(0, discoveredCandidatesPerStrategy)) {
      ids.add(ranking.species.id);
    }
  }

  return Array.from(ids);
}

function isDiscoveryEligible(
  species: PvPokePokemon,
  byMoveId: Map<string, PvPokeMove>,
) {
  if (
    species.speciesId.includes("_shadow") ||
    species.speciesId.includes("_mega") ||
    species.speciesId.includes("_primal")
  ) {
    return false;
  }

  const hasHighEnergyFastMove = species.fastMoves.some((moveId) => {
    const move = byMoveId.get(moveId);

    return move ? fastMoveEnergyPerTurn(move) >= 4 : false;
  });
  const hasCheapChargedMove = species.chargedMoves.some((moveId) => {
    const move = byMoveId.get(moveId);

    return (move?.energy ?? Infinity) <= 45;
  });

  return (
    hasHighEnergyFastMove &&
    hasCheapChargedMove &&
    species.chargedMoves.length >= 2
  );
}

function fastMoveEnergyPerTurn(move: PvPokeMove) {
  if (!move.energyGain) {
    return 0;
  }

  const turns =
    move.turns ?? Math.max(1, Math.round((move.cooldown ?? 500) / 500));

  return move.energyGain / turns;
}

function orderedUnique(values: string[]) {
  return Array.from(new Set(values));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
