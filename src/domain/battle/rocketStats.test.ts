import { describe, expect, it } from "vitest";
import { loadApplicationData } from "../../data/loaders";
import { calculateRocketEffectiveStats, getRocketCpm } from "./rocketStats";

describe("Rocket opponent stats", () => {
  it("converts Rocket CPM decimals to single-precision floats", () => {
    expect(getRocketCpm(8)).toBeCloseTo(0.29899999499320984, 16);
    expect(getRocketCpm(50)).toBeCloseTo(1.1109999418258667, 16);
    expect(getRocketCpm(70)).toBeCloseTo(1.2649999856948853, 16);
    expect(getRocketCpm(80)).toBeCloseTo(1.315000057220459, 16);
  });

  it("calculates level-80 Grunt Granbull stats and displayed CP", () => {
    const stats = calculateRocketEffectiveStats({
      species: {
        id: "granbull",
        name: "Granbull",
        dex: 210,
        types: ["fairy"],
        baseStats: {
          attack: 212,
          defense: 131,
          stamina: 207,
        },
        fastMoves: [],
        chargedMoves: [],
        tags: [],
        provenance: {
          sourceName: "test",
          sourceUrl: "https://example.com",
          retrievedAt: "2026-08-03T00:00:00.000Z",
          sourceVersion: "test",
          parserVersion: "test",
          license: "test",
          category: "sourced",
          notes: "test fixture",
        },
      },
      trainerLevel: 80,
      trainerClass: "grunt",
    });

    expect(getRocketCpm(80)).toBeCloseTo(1.315000057220459, 16);
    expect(stats.attackIv).toBe(166);
    expect(stats.attack).toBeCloseTo(497.0700216293335, 12);
    expect(stats.defense).toBeCloseTo(191.990008354187, 12);
    expect(stats.stamina).toBeCloseTo(174.89500761032104, 12);
    expect(stats.hp).toBe(174);
    expect(stats.cp).toBe(9108);
  });

  it("applies higher rank multipliers for Leaders and Giovanni", () => {
    const data = loadApplicationData();
    const persian = data.pokemon.rocketOpponents.find(
      (species) => species.id === "persian",
    );

    if (!persian) {
      throw new Error("Missing Persian Rocket opponent fixture");
    }

    const grunt = calculateRocketEffectiveStats({
      species: persian,
      trainerLevel: 50,
      trainerClass: "grunt",
    });
    const leader = calculateRocketEffectiveStats({
      species: persian,
      trainerLevel: 50,
      trainerClass: "leader",
    });
    const giovanni = calculateRocketEffectiveStats({
      species: persian,
      trainerLevel: 50,
      trainerClass: "giovanni",
    });

    expect(leader.attack / grunt.attack).toBeCloseTo(1.05, 6);
    expect(giovanni.attack / grunt.attack).toBeCloseTo(1.15, 6);
    expect(leader.hp).toBeGreaterThan(grunt.hp);
    expect(giovanni.hp).toBeGreaterThan(leader.hp);
  });
});
