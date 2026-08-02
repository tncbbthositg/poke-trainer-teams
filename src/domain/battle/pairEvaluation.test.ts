import { describe, expect, it } from "vitest";
import { loadApplicationData } from "../../data/loaders";
import type { ChargedMove, FastMove } from "../../data/schemas/moves";
import type { PokemonSpecies } from "../../data/schemas/pokemon";
import type { PokemonBuild } from "../pokemon/types";
import { evaluateUniversalPairExperimental } from "./pairEvaluation";

describe("universal pair evaluation", () => {
  it("evaluates an ordered pair across every supplied lineup", () => {
    const data = loadApplicationData();
    const kingambit = buildFor(
      data,
      "kingambit",
      "SNARL",
      "DARK_PULSE",
      "IRON_HEAD",
    );
    const lucario = buildFor(
      data,
      "lucario",
      "COUNTER",
      "POWER_UP_PUNCH",
      "AURA_SPHERE",
    );

    const evaluation = evaluateUniversalPairExperimental({
      lead: kingambit,
      backup: lucario,
      lineups: data.rocket.lineups.slice(0, 3),
      mechanics: data.mechanics,
      rocketOpponents: data.pokemon.rocketOpponents,
      moves: data.moves,
      strategy: "charge-asap",
    });

    expect(evaluation.totalLineups).toBe(3);
    expect(evaluation.lineupEvaluations).toHaveLength(3);
    expect(evaluation.proxyClears + evaluation.proxyFailures).toBe(3);
    expect(evaluation.confidence).toBe("proxy-estimate");
    expect(evaluation.simulationVersion).toBe("m2-experimental-rocket-0.5.0");
    expect(
      evaluation.lineupEvaluations[0].result.pokemonUsed,
    ).toBeLessThanOrEqual(2);
  });

  it("reports failing lineups without treating proxy clears as verified", () => {
    const data = loadApplicationData();
    const mewtwo = buildFor(
      data,
      "mewtwo",
      "PSYCHO_CUT",
      "PSYSTRIKE",
      "FLAMETHROWER",
    );
    const swampert = buildFor(
      data,
      "swampert",
      "MUD_SHOT",
      "HYDRO_CANNON",
      "EARTHQUAKE",
    );
    const hardMechanics = {
      ...data.mechanics,
      values: data.mechanics.values.map((value) =>
        value.key.startsWith("rocket_opponent_hp_slot_")
          ? { ...value, value: 9999 }
          : value,
      ),
    };

    const evaluation = evaluateUniversalPairExperimental({
      lead: mewtwo,
      backup: swampert,
      lineups: data.rocket.lineups.slice(0, 2),
      mechanics: hardMechanics,
      rocketOpponents: [],
      moves: data.moves,
      strategy: "minimal-interaction",
    });

    expect(evaluation.universalProxyClear).toBe(false);
    expect(evaluation.proxyFailures).toBeGreaterThan(0);
    expect(evaluation.failingLineups.length).toBe(evaluation.proxyFailures);
    expect(
      evaluation.failingLineups[0].result.assumptionsUsed.join(" "),
    ).toMatch(/not a verified Rocket win\/loss/);
  });
});

function buildFor(
  data: ReturnType<typeof loadApplicationData>,
  speciesId: string,
  fastMoveId: string,
  chargedOneId: string,
  chargedTwoId: string,
): PokemonBuild {
  const species = data.pokemon.candidates.find(
    (candidate: PokemonSpecies) => candidate.id === speciesId,
  );
  const fastMove = data.moves.fastMoves.find(
    (move: FastMove) => move.id === fastMoveId,
  );
  const chargedOne = data.moves.chargedMoves.find(
    (move: ChargedMove) => move.id === chargedOneId,
  );
  const chargedTwo = data.moves.chargedMoves.find(
    (move: ChargedMove) => move.id === chargedTwoId,
  );

  if (!species || !fastMove || !chargedOne || !chargedTwo) {
    throw new Error(`Missing test build data for ${speciesId}`);
  }

  return {
    species,
    level: 40,
    ivs: { attack: 15, defense: 15, stamina: 15 },
    shadow: false,
    bestBuddy: false,
    fastMove,
    chargedMoves: [chargedOne, chargedTwo],
  };
}
