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
    expect(result.simulationVersion).toBe("m2-experimental-rocket-0.3.0");
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
      result.events.some(
        (event) =>
          event.actor === "rocket" &&
          event.kind === "fast-resolve" &&
          event.attack &&
          event.attack.totalDamage > 0,
      ),
    ).toBe(true);
    expect(
      result.events.some((event) =>
        event.message.includes(
          "pauses for 4 turn(s) after the player switch",
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
      (item) => item.id === "grunt-normal-male-2026-06-25",
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
      (item) => item.id === "grunt-normal-male-2026-06-25",
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

    expect(firstFastResolve?.message).toContain("Teddiursa HP is 105");
  });

  it("uses the cheapest available charged move to break Rocket shields", () => {
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
      (item) => item.id === "leader-arlo-2026-07-31",
    )!;

    const result = simulateRocketLineupExperimental({
      lead: {
        ...lucario,
        fastMove: { ...lucario.fastMove, energyGain: 100 },
      },
      backup: swampert,
      lineup,
      mechanics: data.mechanics,
      rocketOpponents: data.pokemon.rocketOpponents,
      moves: data.moves,
      strategy: "fastest-expected-knockout",
      maxTurns: 4,
    });

    expect(
      result.events.some((event) =>
        event.message.includes("shields Power-Up Punch"),
      ),
    ).toBe(true);
    expect(
      result.events.some((event) =>
        event.message.includes("shields Aura Sphere"),
      ),
    ).toBe(false);
  });

  it("does not spend a charged move when the next fast move will knock out", () => {
    const data = loadApplicationData();
    const swampert = buildFor(
      data,
      "swampert",
      "MUD_SHOT",
      "HYDRO_CANNON",
      "EARTHQUAKE",
    );
    const lucario = buildFor(
      data,
      "lucario",
      "COUNTER",
      "POWER_UP_PUNCH",
      "AURA_SPHERE",
    );
    const baseLineup = data.rocket.lineups.find(
      (item) => item.id === "grunt-normal-male-2026-06-25",
    )!;
    const singleOpponentLineup = {
      ...baseLineup,
      slots: [baseLineup.slots[0]],
    };
    const lowHpMechanics = {
      ...data.mechanics,
      values: data.mechanics.values.map((item) =>
        item.key === "rocket_opponent_hp_slot_1"
          ? { ...item, value: 15 }
          : item,
      ),
    };

    const result = simulateRocketLineupExperimental({
      lead: swampert,
      backup: lucario,
      lineup: singleOpponentLineup,
      mechanics: lowHpMechanics,
      rocketOpponents: [],
      moves: data.moves,
      strategy: "fastest-expected-knockout",
      maxTurns: 40,
    });

    expect(result.outcome).toBe("win");
    expect(result.chargedAttacksUsed).toBe(0);
    expect(
      result.events.some((event) => event.kind === "charged-attack"),
    ).toBe(false);
    expect(
      result.events.some((event) =>
        event.message.includes("Mud Shot resolves; Teddiursa HP is 0"),
      ),
    ).toBe(true);
  });

  it("caps player energy at 100 before charged move spending", () => {
    const data = loadApplicationData();
    const swampert = buildFor(
      data,
      "swampert",
      "MUD_SHOT",
      "HYDRO_CANNON",
      "EARTHQUAKE",
    );
    const lucario = buildFor(
      data,
      "lucario",
      "COUNTER",
      "POWER_UP_PUNCH",
      "AURA_SPHERE",
    );
    const baseLineup = data.rocket.lineups.find(
      (item) => item.id === "grunt-normal-male-2026-06-25",
    )!;
    const highHpMechanics = {
      ...data.mechanics,
      values: data.mechanics.values.map((item) =>
        item.key === "rocket_opponent_hp_slot_1"
          ? { ...item, value: 999 }
          : item,
      ),
    };

    const result = simulateRocketLineupExperimental({
      lead: {
        ...swampert,
        fastMove: { ...swampert.fastMove, turns: 1, energyGain: 60 },
        chargedMoves: [
          { ...swampert.chargedMoves[0], energyCost: 90, power: 1 },
        ],
      },
      backup: lucario,
      lineup: {
        ...baseLineup,
        slots: [baseLineup.slots[0]],
      },
      mechanics: highHpMechanics,
      rocketOpponents: [],
      moves: data.moves,
      strategy: "charge-asap",
      maxTurns: 3,
    });

    expect(result.chargedAttacksUsed).toBe(1);
    expect(
      result.events.filter(
        (event) => event.actor === "player" && event.kind === "charged-attack",
      ),
    ).toHaveLength(1);
  });

  it("switches once after the lead faints and never uses a third slot", () => {
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
    const baseLineup = data.rocket.lineups.find(
      (item) => item.id === "grunt-normal-male-2026-06-25",
    )!;
    const punishingMechanics = {
      ...data.mechanics,
      values: data.mechanics.values.map((item) => {
        if (item.key === "rocket_opponent_hp_slot_1") {
          return { ...item, value: 999 };
        }
        if (item.key === "rocket_incoming_damage_per_turn_grunt") {
          return { ...item, value: 999 };
        }
        return item;
      }),
    };

    const result = simulateRocketLineupExperimental({
      lead: lucario,
      backup: swampert,
      lineup: {
        ...baseLineup,
        slots: [baseLineup.slots[0]],
      },
      mechanics: punishingMechanics,
      rocketOpponents: [],
      moves: data.moves,
      strategy: "charge-asap",
      maxTurns: 8,
    });

    expect(result.outcome).toBe("loss");
    expect(result.switches).toBe(1);
    expect(result.pokemonUsed).toBe(2);
    expect(result.pokemonFainted).toBe(2);
    expect(
      result.events.some((event) =>
        event.message.includes("Third slot remains unavailable"),
      ),
    ).toBe(true);
    expect(result.assumptionsUsed.join(" ")).toMatch(/Third slot unavailable/);
  });

  it("treats the pair as ordered by entering the selected lead first", () => {
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
      (item) => item.id === "grunt-normal-male-2026-06-25",
    )!;

    const lucarioLead = simulateRocketLineupExperimental({
      lead: lucario,
      backup: swampert,
      lineup,
      mechanics: data.mechanics,
      rocketOpponents: [],
      moves: data.moves,
      strategy: "charge-asap",
      maxTurns: 2,
    });
    const swampertLead = simulateRocketLineupExperimental({
      lead: swampert,
      backup: lucario,
      lineup,
      mechanics: data.mechanics,
      rocketOpponents: [],
      moves: data.moves,
      strategy: "charge-asap",
      maxTurns: 2,
    });

    expect(lucarioLead.events[0].message).toContain("Lucario enters");
    expect(swampertLead.events[0].message).toContain("Swampert enters");
    expect(lucarioLead.events[0].message).not.toBe(
      swampertLead.events[0].message,
    );
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
