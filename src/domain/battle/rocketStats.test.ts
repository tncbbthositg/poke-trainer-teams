import { describe, expect, it } from "vitest";
import { loadApplicationData } from "../../data/loaders";
import { calculateRocketEffectiveStats } from "./rocketStats";

describe("Rocket opponent stats", () => {
  it("calculates sourced Rocket stats at trainer level 50 for Grunts", () => {
    const data = loadApplicationData();
    const teddiursa = data.pokemon.rocketOpponents.find(
      (species) => species.id === "teddiursa",
    );

    if (!teddiursa) {
      throw new Error("Missing Teddiursa Rocket opponent fixture");
    }

    const stats = calculateRocketEffectiveStats({
      species: teddiursa,
      trainerLevel: 50,
      trainerClass: "grunt",
    });

    expect(stats.cp).toBe(4750);
    expect(stats.hp).toBe(154);
    expect(stats.attack).toBeCloseTo(445.653, 3);
    expect(stats.defense).toBeCloseTo(73.763, 3);
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
