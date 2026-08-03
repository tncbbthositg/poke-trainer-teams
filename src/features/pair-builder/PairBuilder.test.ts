import { describe, expect, it } from "vitest";
import type { BattleEvent } from "../../domain/battle/types";
import { battleHpSegments, hpStateAtTurn } from "./timelineHp";

const baseState = {
  playerHp: 100,
  playerMaxHp: 100,
  playerTypes: ["fire"],
  opponentHp: 100,
  opponentMaxHp: 100,
  opponentTypes: ["dragon"],
} satisfies Partial<BattleEvent>;

function event(
  turn: number,
  kind: BattleEvent["kind"],
  state: Partial<BattleEvent>,
): BattleEvent {
  return {
    turn,
    wallClockSeconds: turn * 0.5,
    actor: "player",
    kind,
    message: kind,
    ...state,
  };
}

describe("battle timeline HP sampling", () => {
  it("holds fast-move HP changes until the resolve turn", () => {
    const segments = battleHpSegments(
      [
        event(0, "pokemon-enter", baseState),
        event(0, "fast-start", baseState),
        event(3, "fast-resolve", {
          ...baseState,
          playerHp: 70,
          opponentHp: 80,
        }),
      ],
      6,
    );

    expect(hpStateAtTurn(segments, 1.5)).toMatchObject({
      playerHp: 100,
      opponentHp: 100,
    });
    expect(hpStateAtTurn(segments, 3)).toMatchObject({
      playerHp: 70,
      opponentHp: 80,
    });
  });

  it("interpolates charged-attack HP changes over the charged span", () => {
    const segments = battleHpSegments(
      [
        event(0, "pokemon-enter", baseState),
        event(4, "charged-attack", {
          ...baseState,
          opponentHp: 40,
          durationTurns: 2,
        }),
      ],
      8,
    );

    expect(hpStateAtTurn(segments, 5)).toMatchObject({
      playerHp: 100,
      opponentHp: 70,
    });
    expect(hpStateAtTurn(segments, 6)).toMatchObject({
      playerHp: 100,
      opponentHp: 40,
    });
  });
});
