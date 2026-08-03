import { describe, expect, it } from "vitest";
import { loadApplicationData } from "../../data/loaders";
import {
  bestMovesetForStrategy,
  hasScarceCandyAccess,
  hasRocketReliabilityWarning,
  rankPokemonForBossFocus,
  rankPokemonForFocus,
  type PokemonFocusStrategy,
} from "./pokemonFocus";

describe("pokemon focus ranking", () => {
  const data = loadApplicationData();
  const strategies: PokemonFocusStrategy[] = [
    "fastest-victory",
    "charged-pause-control",
    "practical-spam",
  ];

  it.each(strategies)("ranks every candidate for %s", (strategy) => {
    const rankings = rankPokemonForFocus(
      data.pokemon.candidates,
      data.moves,
      strategy,
    );

    expect(rankings).toHaveLength(data.pokemon.candidates.length);
    expect(rankings.map((ranking) => ranking.rank)).toEqual(
      data.pokemon.candidates.map((_, index) => index + 1),
    );
    expect(rankings.at(0)?.score).toBeGreaterThanOrEqual(
      rankings.at(-1)?.score ?? 0,
    );
    expect(rankings.every((ranking) => ranking.reason.length > 0)).toBe(true);
  });

  it("recommends legal moves for the chosen species", () => {
    const swampert = data.pokemon.candidates.find(
      (pokemon) => pokemon.id === "swampert",
    )!;
    const moveset = bestMovesetForStrategy(
      swampert,
      data.moves,
      "charged-pause-control",
    );

    expect(swampert.fastMoves).toContain(moveset.fastMove.id);
    expect(swampert.chargedMoves).toContain(moveset.chargedMoves[0].id);
    expect(swampert.chargedMoves).toContain(moveset.chargedMoves[1].id);
    expect(moveset.firstChargeTurns).toBeGreaterThan(0);
    expect(moveset.repeatChargeTurns).toBeGreaterThan(0);
  });

  it("orders recommended charged moves by cost, then STAB-adjusted DPE", () => {
    const mewtwo = data.pokemon.candidates.find(
      (pokemon) => pokemon.id === "mewtwo",
    )!;
    const moveset = bestMovesetForStrategy(
      mewtwo,
      data.moves,
      "charged-pause-control",
    );

    expect(moveset.chargedMoves[0].id).toBe("PSYSTRIKE");
    expect(moveset.chargedMoves[1].id).toBe("FLAMETHROWER");
  });

  it("uses total charged-cycle output over raw fast-move pressure for fastest Mewtwo", () => {
    const mewtwo = data.pokemon.candidates.find(
      (pokemon) => pokemon.id === "mewtwo",
    )!;
    const moveset = bestMovesetForStrategy(
      mewtwo,
      data.moves,
      "fastest-victory",
    );

    expect(moveset.fastMove.id).toBe("PSYCHO_CUT");
    expect(moveset.firstChargeTurns).toBe(10);
    expect(moveset.neutralOutputPerTurn).toBeGreaterThan(13);
  });

  it("discounts severe guaranteed self-debuff charged moves for Rocket rankings", () => {
    const blacephalon = data.pokemon.candidates.find(
      (pokemon) => pokemon.id === "blacephalon",
    )!;
    const fastestRankings = rankPokemonForFocus(
      data.pokemon.candidates,
      data.moves,
      "fastest-victory",
    );
    const fastestBlacephalon = fastestRankings.find(
      (ranking) => ranking.species.id === blacephalon.id,
    )!;
    const spamMoveset = bestMovesetForStrategy(
      blacephalon,
      data.moves,
      "charged-pause-control",
    );

    expect(fastestBlacephalon.rank).toBeGreaterThan(1);
    expect(spamMoveset.chargedMoves.map((move) => move.id)).not.toContain(
      "MIND_BLOWN",
    );
    expect(spamMoveset.chargedMoves.map((move) => move.id)).not.toContain(
      "OVERHEAT",
    );
    expect(spamMoveset.selfDebuffMultiplier).toBe(1);
  });

  it("includes Origin Forme Dialga and Palkia with signature charged moves", () => {
    const byId = new Map(
      data.pokemon.candidates.map((pokemon) => [pokemon.id, pokemon]),
    );

    expect(byId.get("dialga_origin")?.name).toBe("Dialga (Origin)");
    expect(byId.get("dialga_origin")?.chargedMoves).toContain("ROAR_OF_TIME");
    expect(byId.get("palkia_origin")?.name).toBe("Palkia (Origin)");
    expect(byId.get("palkia_origin")?.chargedMoves).toContain("SPACIAL_REND");
  });

  it("weights practical spam away from scarce raid-candy candidates", () => {
    const rankings = rankPokemonForFocus(
      data.pokemon.candidates,
      data.moves,
      "practical-spam",
    );
    const rankById = new Map(
      rankings.map((ranking) => [ranking.species.id, ranking.rank]),
    );

    expect(rankById.get("greninja")).toBeLessThan(
      rankById.get("palkia") ?? Infinity,
    );
    expect(rankById.get("swampert")).toBeLessThan(
      rankById.get("groudon") ?? Infinity,
    );
    expect(rankById.get("swampert")).toBeLessThan(
      rankById.get("lucario") ?? Infinity,
    );
    expect(rankings[0].reason).toContain("build-pressure weighted");
  });

  it("weights spam rankings toward charge cadence and Rocket-control reliability over raw fast damage", () => {
    const rankings = rankPokemonForFocus(
      data.pokemon.candidates,
      data.moves,
      "charged-pause-control",
    );
    const rankById = new Map(
      rankings.map((ranking) => [ranking.species.id, ranking.rank]),
    );
    const kingambit = rankings.find(
      (ranking) => ranking.species.id === "kingambit",
    )!;

    expect(rankById.get("kingambit")).toBeLessThan(
      rankById.get("blacephalon") ?? Infinity,
    );
    expect(kingambit.moveset.fastMove.turns).toBeLessThanOrEqual(2);
    expect(kingambit.moveset.repeatChargeTurns).toBe(10);
    expect(kingambit.reason).toContain("fast cadence");
  });

  it("uses boss proxy clear coverage before heuristic score for Rocket-control rankings", () => {
    const bossProxyCandidateIds = new Set([
      "annihilape",
      "greninja",
      "kingambit",
      "palkia_origin",
      "terrakion",
    ]);
    const bossProxyCandidates = data.pokemon.candidates.filter((pokemon) =>
      bossProxyCandidateIds.has(pokemon.id),
    );
    const rankings = rankPokemonForBossFocus({
      candidates: bossProxyCandidates,
      moves: data.moves,
      lineups: data.rocket.lineups,
      mechanics: data.mechanics,
      rocketOpponents: data.pokemon.rocketOpponents,
      strategy: "charged-pause-control",
    });
    const rankById = new Map(
      rankings.map((ranking) => [ranking.species.id, ranking.rank]),
    );
    const kingambit = rankings.find(
      (ranking) => ranking.species.id === "kingambit",
    )!;
    const annihilape = rankings.find(
      (ranking) => ranking.species.id === "annihilape",
    )!;

    expect(kingambit.bossProxy?.clears).toBe(4);
    expect(kingambit.bossProxy?.total).toBe(4);
    expect(kingambit.bossProxy?.bestPartner.id).toBe("terrakion");
    expect(annihilape.bossProxy?.clears).toBe(4);
    expect(rankById.get("kingambit")).toBeLessThan(
      rankById.get("palkia_origin") ?? Infinity,
    );
    expect(kingambit.reason).toContain("boss proxy clears");
  });

  it("deprioritizes Morpeko after failed Rocket field validation", () => {
    const byId = new Map(
      data.pokemon.candidates.map((pokemon) => [pokemon.id, pokemon]),
    );
    const morpeko = byId.get("morpeko_full_belly")!;

    expect(hasRocketReliabilityWarning(morpeko)).toBe(true);
    expect(morpeko.provenance.notes).toMatch(/field report/i);

    for (const strategy of strategies) {
      const rankings = rankPokemonForFocus(
        data.pokemon.candidates,
        data.moves,
        strategy,
      );
      const rank = rankings.find(
        (ranking) => ranking.species.id === morpeko.id,
      )?.rank;

      expect(rank).toBeGreaterThanOrEqual(data.pokemon.candidates.length - 1);
    }
  });

  it("classifies scarce candy candidates for filtering", () => {
    const byId = new Map(
      data.pokemon.candidates.map((pokemon) => [pokemon.id, pokemon]),
    );

    expect(hasScarceCandyAccess(byId.get("mewtwo")!)).toBe(true);
    expect(hasScarceCandyAccess(byId.get("lucario")!)).toBe(true);
    expect(hasScarceCandyAccess(byId.get("dialga_origin")!)).toBe(true);
    expect(hasScarceCandyAccess(byId.get("palkia_origin")!)).toBe(true);
    expect(hasScarceCandyAccess(byId.get("swampert")!)).toBe(false);
    expect(hasScarceCandyAccess(byId.get("greninja")!)).toBe(false);
  });
});
