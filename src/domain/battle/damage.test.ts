import { describe, expect, it } from "vitest";
import { calculateTrainerBattleDamage, stageMultiplier } from "./damage";

describe("Trainer Battle damage", () => {
  it("applies stage multipliers with Pokemon GO limits", () => {
    expect(stageMultiplier(-4)).toBe(0.5);
    expect(stageMultiplier(-3)).toBeCloseTo(4 / 7);
    expect(stageMultiplier(-2)).toBeCloseTo(2 / 3);
    expect(stageMultiplier(-1)).toBe(0.8);
    expect(stageMultiplier(0)).toBe(1);
    expect(stageMultiplier(1)).toBe(1.25);
    expect(stageMultiplier(2)).toBe(1.5);
    expect(stageMultiplier(3)).toBe(1.75);
    expect(stageMultiplier(4)).toBe(2);
    expect(stageMultiplier(5)).toBe(2);
    expect(stageMultiplier(-5)).toBe(0.5);
  });

  it("calculates damage against Rocket Granbull with Shadow defense", () => {
    const input = {
      movePower: 10,
      attackerAttack: 250,
      defenderDefense: 191.990008354187,
      defenderIsShadow: true,
      stab: 1.2,
      effectiveness: 1,
      attackStage: 0,
      defenseStage: 0,
      chargedAttackQuality: 1,
    };

    expect(calculateTrainerBattleDamage(input)).toBe(13);
    expect(
      calculateTrainerBattleDamage({
        ...input,
        attackerIsShadow: true,
      }),
    ).toBe(15);
    expect(calculateTrainerBattleDamage({ ...input, shielded: true })).toBe(1);
    expect(
      calculateTrainerBattleDamage({
        ...input,
        attackerIsShadow: true,
        shielded: true,
      }),
    ).toBe(1);
  });
});
