import { describe, expect, it } from "vitest";
import { loadApplicationData } from "../../data/loaders";
import type { PokemonBuild } from "../pokemon/types";
import {
  createNotSimulatedResult,
  simulatePlayerOffensePreview,
  simulateRocketLineupExperimental,
} from "./engine";

describe("battle engine interface scaffold", () => {
  it("returns deterministic not-simulated results without using slot three", () => {
    const a = createNotSimulatedResult("test boundary");
    const b = createNotSimulatedResult("test boundary");
    expect(a).toEqual(b);
    expect(a.outcome).toBe("not-simulated");
    expect(a.confidence).toBe("not-simulated");
    expect(a.pokemonUsed).toBe(0);
    expect(a.assumptionsUsed).toContain("test boundary");
  });

  it("previews deterministic player-side offense without claiming win/loss", () => {
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

    const a = simulatePlayerOffensePreview({
      lead: mewtwo,
      backup: swampert,
      strategy: "charge-asap",
      maxTurns: 20,
    });
    const b = simulatePlayerOffensePreview({
      lead: mewtwo,
      backup: swampert,
      strategy: "charge-asap",
      maxTurns: 20,
    });

    expect(a).toEqual(b);
    expect(a.outcome).toBe("not-simulated");
    expect(a.confidence).toBe("not-simulated");
    expect(a.simulationVersion).toBe("m2-player-offense-preview-0.1.0");
    expect(a.fastAttacksUsed).toBe(10);
    expect(a.chargedAttacksUsed).toBe(2);
    expect(a.pokemonUsed).toBe(1);
    expect(a.pokemonFainted).toBe(0);
    expect(a.assumptionsUsed.join(" ")).toMatch(/win\/loss are disabled/);
    expect(a.events.some((event) => event.kind === "charged-attack")).toBe(
      true,
    );
  });

  it("runs an experimental Rocket branch with shields and two-slot limit", () => {
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
    const lineup = data.rocket.lineups.find(
      (item) => item.id === "leader-arlo-2026-07-31",
    )!;

    const result = simulateRocketLineupExperimental({
      lead: mewtwo,
      backup: swampert,
      lineup,
      mechanics: data.mechanics,
      rocketOpponents: data.pokemon.rocketOpponents,
      moves: data.moves,
      strategy: "charge-asap",
    });

    expect(["win", "loss"]).toContain(result.outcome);
    expect(result.confidence).toBe("proxy-estimate");
    expect(result.simulationVersion).toBe("m2-experimental-rocket-0.1.0");
    expect(result.pokemonUsed).toBeLessThanOrEqual(2);
    expect(result.shieldsUsed).toBeLessThanOrEqual(4);
    expect(result.assumptionsUsed.join(" ")).toMatch(/Proxy estimate/);
    expect(result.assumptionsUsed.join(" ")).toMatch(
      /not a verified Rocket win\/loss/,
    );
    expect(result.assumptionsUsed.join(" ")).toMatch(/Third slot unavailable/);
    expect(result.events.some((event) => event.kind === "shield")).toBe(true);
    expect(
      result.events.some((event) => event.playerHp && event.opponentHp),
    ).toBe(true);
    expect(
      result.events.some((event) => event.playerTypes?.includes("psychic")),
    ).toBe(true);
    expect(
      result.events.some(
        (event) => event.actor === "rocket" && event.kind === "charged-attack",
      ),
    ).toBe(true);
    expect(
      result.events.some(
        (event) =>
          event.kind === "fast-resolve" &&
          event.attack?.name === "Psycho Cut" &&
          event.attack.totalDamage > 0,
      ),
    ).toBe(true);
    expect(
      result.events.some(
        (event) =>
          event.kind === "charged-attack" &&
          event.attack?.name === "Psystrike" &&
          event.attack.stabBonus > 0,
      ),
    ).toBe(true);
    expect(
      result.events.some((event) => event.message.includes("uses Tackle")),
    ).toBe(true);
    expect(
      result.events.some((event) =>
        event.message.includes(
          "pauses for 1.5 turn(s) after the player switch",
        ),
      ),
    ).toBe(true);
    expect(
      result.events.every(
        (event) => (event.playerHp ?? 0) >= 0 && (event.opponentHp ?? 0) >= 0,
      ),
    ).toBe(true);
  });

  it("uses charged attack battle-turn registration instead of animation wall clock", () => {
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
    const lineup = data.rocket.lineups.find(
      (item) => item.id === "giovanni-2026-07-31",
    )!;

    const result = simulateRocketLineupExperimental({
      lead: kingambit,
      backup: lucario,
      lineup,
      mechanics: data.mechanics,
      strategy: "charge-asap",
    });
    const chargedAttack = result.events.find(
      (event) => event.actor === "player" && event.kind === "charged-attack",
    );
    const shield = result.events.find(
      (event) => event.actor === "rocket" && event.kind === "shield",
    );

    expect(chargedAttack?.durationTurns).toBe(0.5);
    expect(shield?.durationTurns).toBe(0.5);
  });

  it("does not give Grunts Rocket shields", () => {
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
    const lineup = data.rocket.lineups.find(
      (item) => item.id === "grunt-normal-2026-07-31",
    )!;

    const result = simulateRocketLineupExperimental({
      lead: kingambit,
      backup: lucario,
      lineup,
      mechanics: data.mechanics,
      strategy: "charge-asap",
    });

    expect(
      result.events.some((event) =>
        event.message.includes("shields Dark Pulse"),
      ),
    ).toBe(false);
  });

  it("applies player move type effectiveness to Rocket opponent HP", () => {
    const data = loadApplicationData();
    const lucario = buildFor(
      data,
      "lucario",
      "COUNTER",
      "POWER_UP_PUNCH",
      "AURA_SPHERE",
    );
    const swampert = buildFor(
      data,
      "swampert",
      "MUD_SHOT",
      "HYDRO_CANNON",
      "EARTHQUAKE",
    );
    const lineup = data.rocket.lineups.find(
      (item) => item.id === "grunt-normal-2026-07-31",
    )!;

    const result = simulateRocketLineupExperimental({
      lead: lucario,
      backup: swampert,
      lineup,
      mechanics: data.mechanics,
      strategy: "charge-asap",
      maxTurns: 2,
    });
    const firstFastResolve = result.events.find(
      (event) => event.actor === "player" && event.kind === "fast-resolve",
    );

    expect(firstFastResolve?.message).toContain("Teddiursa HP is 100");
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
    (candidate) => candidate.id === speciesId,
  );
  const fastMove = data.moves.fastMoves.find((move) => move.id === fastMoveId);
  const chargedOne = data.moves.chargedMoves.find(
    (move) => move.id === chargedOneId,
  );
  const chargedTwo = data.moves.chargedMoves.find(
    (move) => move.id === chargedTwoId,
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
