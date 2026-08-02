import { describe, expect, it } from "vitest";
import { loadApplicationData } from "../loaders";

describe("checked-in data snapshots", () => {
  it("resolves every candidate and legal move reference", () => {
    const data = loadApplicationData();
    const fastIds = new Set(data.moves.fastMoves.map((move) => move.id));
    const chargedIds = new Set(data.moves.chargedMoves.map((move) => move.id));

    expect(data.pokemon.candidates.length).toBeGreaterThan(35);
    expect(data.pokemon.candidates.length).toBeLessThanOrEqual(120);
    expect(
      data.pokemon.candidates.some((pokemon) => pokemon.id === "chandelure"),
    ).toBe(true);
    expect(
      data.pokemon.candidates.some(
        (pokemon) =>
          pokemon.id.includes("_shadow") ||
          pokemon.id.includes("_mega") ||
          pokemon.id.includes("_primal"),
      ),
    ).toBe(false);
    for (const species of data.pokemon.candidates) {
      expect(species.provenance.sourceName).toBeTruthy();
      species.fastMoves.forEach((move) => expect(fastIds.has(move)).toBe(true));
      species.chargedMoves.forEach((move) =>
        expect(chargedIds.has(move)).toBe(true),
      );
    }
    expect(data.pokemon.rocketOpponents.length).toBeGreaterThan(0);
    for (const species of data.pokemon.rocketOpponents) {
      expect(species.provenance.sourceName).toBeTruthy();
      species.fastMoves.forEach((move) => expect(fastIds.has(move)).toBe(true));
      species.chargedMoves.forEach((move) =>
        expect(chargedIds.has(move)).toBe(true),
      );
    }
  });

  it("keeps Rocket lineups provenance-visible and duplicate-free", () => {
    const data = loadApplicationData();
    const ids = data.rocket.lineups.map((lineup) => lineup.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(data.rocket.lineups.length).toBeGreaterThan(0);
    data.rocket.lineups.forEach((lineup) => {
      expect(lineup.provenance.length).toBeGreaterThan(0);
      expect([
        "verified-agreement",
        "disputed",
        "single-source",
        "unverified",
      ]).toContain(lineup.sourceAgreement);
      if (lineup.sourceAgreement === "disputed") {
        expect(lineup.notes).toMatch(/disputed|disagree/i);
      }
    });
  });
});
