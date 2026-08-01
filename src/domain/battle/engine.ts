import type {
  ChargedMove,
  FastMove,
  MovesSnapshot,
} from "../../data/schemas/moves";
import type { MechanicsSnapshot } from "../../data/schemas/mechanics";
import type { PokemonSpecies, PokemonType } from "../../data/schemas/pokemon";
import type { RocketLineup } from "../../data/schemas/rocket";
import type { PokemonBuild } from "../pokemon/types";
import { calculateEffectiveStats } from "../stats/effectiveStats";
import { stabMultiplier, typeEffectiveness } from "../types/effectiveness";
import type { BattleResult, BattleStrategy } from "./types";

const knownRocketOpponentTypes: Record<string, PokemonType[]> = {
  alakazam: ["psychic"],
  amaura: ["rock", "ice"],
  axew: ["dragon"],
  blastoise: ["water"],
  camerupt: ["fire", "ground"],
  charizard: ["fire", "flying"],
  ferrothorn: ["grass", "steel"],
  flygon: ["ground", "dragon"],
  "galarian-weezing": ["poison", "fairy"],
  gallade: ["psychic", "fighting"],
  golurk: ["ground", "ghost"],
  houndoom: ["dark", "fire"],
  hoothoot: ["normal", "flying"],
  kangaskhan: ["normal"],
  loudred: ["normal"],
  machamp: ["fighting"],
  milotic: ["water"],
  persian: ["normal"],
  porygon: ["normal"],
  reshiram: ["dragon", "fire"],
  rhyperior: ["ground", "rock"],
  scizor: ["bug", "steel"],
  slowbro: ["water", "psychic"],
  snorlax: ["normal"],
  starly: ["normal", "flying"],
  steelix: ["steel", "ground"],
  stufful: ["normal", "fighting"],
  swellow: ["normal", "flying"],
  teddiursa: ["normal"],
  tyranitar: ["rock", "dark"],
  tyrunt: ["rock", "dragon"],
  ursaring: ["normal"],
};

export function createNotSimulatedResult(reason: string): BattleResult {
  return {
    outcome: "not-simulated",
    totalTurns: 0,
    wallClockSeconds: 0,
    pokemonUsed: 0,
    pokemonFainted: 0,
    shieldsUsed: 0,
    chargedAttacksUsed: 0,
    fastAttacksUsed: 0,
    switches: 0,
    playerDecisions: 0,
    assumptionsUsed: [reason],
    simulationVersion: "m1-interface-only",
    events: [
      {
        turn: 0,
        wallClockSeconds: 0,
        actor: "system",
        kind: "battle-end",
        message:
          "Milestone 1 exposes battle interfaces only. Rocket simulator results are not yet implemented.",
      },
    ],
  };
}

export function simulatePlayerOffensePreview({
  lead,
  backup,
  strategy,
  maxTurns = 60,
}: {
  lead: PokemonBuild;
  backup: PokemonBuild;
  strategy: BattleStrategy;
  maxTurns?: number;
}): BattleResult {
  const events: BattleResult["events"] = [
    {
      turn: 0,
      wallClockSeconds: 0,
      actor: "player",
      kind: "pokemon-enter",
      message: `${lead.species.name} enters as lead. ${backup.species.name} is available as backup, but no opponent damage is simulated.`,
    },
  ];
  let turn = 0;
  let energy = 0;
  let fastAttacksUsed = 0;
  let chargedAttacksUsed = 0;

  while (turn + lead.fastMove.turns <= maxTurns) {
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: "player",
      kind: "fast-start",
      message: `${lead.species.name} starts ${lead.fastMove.name}.`,
      moveType: lead.fastMove.type,
    });
    turn += lead.fastMove.turns;
    energy = Math.min(100, energy + lead.fastMove.energyGain);
    fastAttacksUsed += 1;
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: "player",
      kind: "fast-resolve",
      message: `${lead.fastMove.name} resolves; energy is ${energy}.`,
      moveType: lead.fastMove.type,
    });

    const chargedMove = selectChargedMove(lead, energy, strategy);
    if (chargedMove) {
      energy -= chargedMove.energyCost;
      chargedAttacksUsed += 1;
      events.push({
        turn,
        wallClockSeconds: turn * 0.5,
        actor: "player",
        kind: "charged-attack",
        message: `${lead.species.name} uses ${chargedMove.name}; energy is ${energy}.`,
      });
    }
  }

  events.push({
    turn,
    wallClockSeconds: turn * 0.5,
    actor: "system",
    kind: "battle-end",
    message:
      "Player offense preview ended. Rocket HP, damage, shields, pauses, fainting, and win/loss are not simulated yet.",
  });

  return {
    outcome: "not-simulated",
    totalTurns: turn,
    wallClockSeconds: turn * 0.5,
    pokemonUsed: 1,
    pokemonFainted: 0,
    shieldsUsed: 0,
    chargedAttacksUsed,
    fastAttacksUsed,
    switches: 0,
    playerDecisions: chargedAttacksUsed,
    assumptionsUsed: [
      "Player-side offense preview only.",
      "Rocket opponent HP, damage, shields, pauses, fainting, switching, and win/loss are disabled.",
      `${strategy} selects charged attacks from available energy without opponent type effects.`,
    ],
    simulationVersion: "m2-player-offense-preview-0.1.0",
    events,
  };
}

function selectChargedMove(
  build: PokemonBuild,
  energy: number,
  strategy: BattleStrategy,
): ChargedMove | undefined {
  const available = build.chargedMoves.filter(
    (move) => move.energyCost <= energy,
  );
  if (available.length === 0) {
    return undefined;
  }

  if (
    strategy === "fastest-expected-knockout" ||
    strategy === "minimal-interaction"
  ) {
    return available.sort(
      (a, b) => adjustedPower(build, b) - adjustedPower(build, a),
    )[0];
  }

  return available.sort(
    (a, b) =>
      a.energyCost - b.energyCost ||
      adjustedPower(build, b) / b.energyCost -
        adjustedPower(build, a) / a.energyCost,
  )[0];
}

function adjustedPower(build: PokemonBuild, move: ChargedMove) {
  return move.power * stabMultiplier(move.type, build.species.types);
}

export function simulateRocketLineupExperimental({
  lead,
  backup,
  lineup,
  mechanics,
  rocketOpponents = [],
  moves,
  strategy,
  maxTurns = 240,
}: {
  lead: PokemonBuild;
  backup: PokemonBuild;
  lineup: RocketLineup;
  mechanics: MechanicsSnapshot;
  rocketOpponents?: PokemonSpecies[];
  moves?: MovesSnapshot;
  strategy: BattleStrategy;
  maxTurns?: number;
}): BattleResult {
  const config = experimentalRocketConfig(
    lineup,
    mechanics,
    rocketOpponents,
    moves,
  );
  const team = [lead, backup];
  let activeIndex = 0;
  let activeBuild = team[activeIndex];
  let activeHp = calculateEffectiveStats(
    activeBuild.species,
    activeBuild.level,
  ).hp;
  let activeMaxHp = activeHp;
  let energy = 0;
  let turn = 0;
  let fastAttacksUsed = 0;
  let chargedAttacksUsed = 0;
  let shieldsUsed = 0;
  let playerShieldsUsed = 0;
  let switches = 0;
  let pokemonFainted = 0;
  let rocketPausedUntilTurn = 0;
  let currentOpponentIndex = 0;
  let currentOpponent = config.opponents[currentOpponentIndex];
  let opponentHp = currentOpponent.hp;
  let opponentMaxHp = currentOpponent.hp;
  let remainingPlayerShields = config.playerShields;
  let nextRocketChargedTurn = config.opponentChargedAttackIntervalTurns;
  const events: BattleResult["events"] = [
    {
      turn: 0,
      wallClockSeconds: 0,
      actor: "player",
      kind: "pokemon-enter",
      message: `${activeBuild.species.name} enters against ${lineup.trainerName}'s ${currentOpponent.name}.`,
      ...battleState(),
    },
  ];

  while (turn < maxTurns && currentOpponent && activeBuild) {
    const actionStartTurn = turn;
    const rocketWillAttack = actionStartTurn >= rocketPausedUntilTurn;
    const opponentFastMove = worstOpponentFastMove(
      currentOpponent,
      activeBuild,
    );
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: "player",
      kind: "fast-start",
      message: `${activeBuild.species.name} starts ${activeBuild.fastMove.name}.`,
      moveType: activeBuild.fastMove.type,
      ...battleState(),
    });
    if (rocketWillAttack) {
      events.push({
        turn,
        wallClockSeconds: turn * 0.5,
        actor: "rocket",
        kind: "fast-start",
        message: `${currentOpponent.name} starts ${opponentFastMove?.name ?? "attacking"}.`,
        moveType: opponentFastMove?.type,
        ...battleState(),
      });
    }

    turn += activeBuild.fastMove.turns;
    fastAttacksUsed += 1;
    energy = Math.min(100, energy + activeBuild.fastMove.energyGain);
    opponentHp = clampHp(
      opponentHp - playerFastDamage(activeBuild, currentOpponent),
    );
    if (rocketWillAttack) {
      activeHp = clampHp(
        activeHp -
          (opponentFastMove
            ? opponentMoveDamage(currentOpponent, opponentFastMove, activeBuild)
            : config.incomingDamagePerTurn * activeBuild.fastMove.turns),
      );
    }

    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: "player",
      kind: "fast-resolve",
      message: `${activeBuild.fastMove.name} resolves; ${currentOpponent.name} HP is ${Math.max(0, Math.ceil(opponentHp))}.`,
      moveType: activeBuild.fastMove.type,
      ...battleState(),
    });
    if (rocketWillAttack) {
      events.push({
        turn,
        wallClockSeconds: turn * 0.5,
        actor: "rocket",
        kind: "fast-resolve",
        message: `${currentOpponent.name} uses ${opponentFastMove?.name ?? "attack"}; ${activeBuild.species.name} HP is ${Math.max(0, Math.ceil(activeHp))}.`,
        moveType: opponentFastMove?.type,
        ...battleState(),
      });
    }

    if (opponentHp <= 0) {
      const nextOpponent = advanceOpponent();
      if (!nextOpponent) {
        return finish("win");
      }
      continue;
    }

    if (activeHp <= 0) {
      if (!switchToBackup()) {
        return finish("loss");
      }
      continue;
    }

    if (rocketWillAttack && turn >= nextRocketChargedTurn) {
      const opponentChargedMove = worstOpponentChargedMove(
        currentOpponent,
        activeBuild,
      );
      chargedAttacksUsed += 1;
      const playerShielded = remainingPlayerShields > 0;
      if (playerShielded) {
        remainingPlayerShields -= 1;
        playerShieldsUsed += 1;
      } else {
        activeHp = clampHp(
          activeHp -
            (opponentChargedMove
              ? opponentMoveDamage(
                  currentOpponent,
                  opponentChargedMove,
                  activeBuild,
                )
              : config.opponentChargedAttackDamage),
        );
      }
      events.push({
        turn,
        wallClockSeconds: turn * 0.5,
        actor: "rocket",
        kind: "charged-attack",
        message: playerShielded
          ? `${currentOpponent.name} uses ${opponentChargedMove?.name ?? "Charged Attack"}; player shields.`
          : `${currentOpponent.name} uses ${opponentChargedMove?.name ?? "Charged Attack"}; ${activeBuild.species.name} HP is ${Math.max(0, Math.ceil(activeHp))}.`,
        moveType:
          opponentChargedMove?.type ?? currentOpponent.types[0] ?? "normal",
        durationTurns: config.chargedAttackTurns,
        ...battleState(),
      });
      if (playerShielded) {
        events.push({
          turn,
          wallClockSeconds: turn * 0.5,
          actor: "player",
          kind: "shield",
          message: `${activeBuild.species.name} shields Charged Attack; ${remainingPlayerShields} shield(s) remain.`,
          durationTurns: config.chargedAttackTurns,
          ...battleState(),
        });
      }
      turn += config.chargedAttackTurns;
      nextRocketChargedTurn = turn + config.opponentChargedAttackIntervalTurns;
      if (activeHp <= 0) {
        if (!switchToBackup()) {
          return finish("loss");
        }
        continue;
      }
    }

    const chargedMove = selectChargedMove(activeBuild, energy, strategy);
    if (chargedMove) {
      energy -= chargedMove.energyCost;
      chargedAttacksUsed += 1;
      const chargedAttackTurns = config.chargedAttackTurns;

      if (config.remainingShields > 0) {
        config.remainingShields -= 1;
        shieldsUsed += 1;
        events.push({
          turn,
          wallClockSeconds: turn * 0.5,
          actor: "player",
          kind: "charged-attack",
          message: `${activeBuild.species.name} uses ${chargedMove.name}; ${lineup.trainerName} shields.`,
          moveType: chargedMove.type,
          durationTurns: chargedAttackTurns,
          ...battleState(),
        });
        events.push({
          turn,
          wallClockSeconds: turn * 0.5,
          actor: "rocket",
          kind: "shield",
          message: `${lineup.trainerName} shields ${chargedMove.name}; ${config.remainingShields} shield(s) remain.`,
          durationTurns: chargedAttackTurns,
          ...battleState(),
        });
      } else {
        opponentHp = clampHp(
          opponentHp -
            playerChargedDamage(activeBuild, chargedMove, currentOpponent),
        );
        events.push({
          turn,
          wallClockSeconds: turn * 0.5,
          actor: "player",
          kind: "charged-attack",
          message: `${activeBuild.species.name} uses ${chargedMove.name}; ${currentOpponent.name} HP is ${Math.max(0, Math.ceil(opponentHp))}.`,
          moveType: chargedMove.type,
          durationTurns: chargedAttackTurns,
          ...battleState(),
        });
      }

      turn += chargedAttackTurns;

      if (config.pauseAfterChargedTurns > 0) {
        rocketPausedUntilTurn = turn + config.pauseAfterChargedTurns;
        events.push({
          turn,
          wallClockSeconds: turn * 0.5,
          actor: "rocket",
          kind: "pause",
          message: `${lineup.trainerName} pauses for ${config.pauseAfterChargedTurns} turn(s) after the player Charged Attack.`,
          ...battleState(),
        });
      }

      if (opponentHp <= 0) {
        const nextOpponent = advanceOpponent();
        if (!nextOpponent) {
          return finish("win");
        }
      }
    }
  }

  return finish(currentOpponent ? "loss" : "win");

  function advanceOpponent() {
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: "rocket",
      kind: "faint",
      message: `${currentOpponent.name} faints under experimental HP.`,
      ...battleState(),
    });
    currentOpponentIndex += 1;
    currentOpponent = config.opponents[currentOpponentIndex];
    if (!currentOpponent) {
      return undefined;
    }
    opponentHp = currentOpponent.hp;
    opponentMaxHp = currentOpponent.hp;
    nextRocketChargedTurn = turn + config.opponentChargedAttackIntervalTurns;
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: "rocket",
      kind: "pokemon-enter",
      message: `${lineup.trainerName} sends in ${currentOpponent.name}.`,
      ...battleState(),
    });
    return currentOpponent;
  }

  function switchToBackup() {
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: "player",
      kind: "faint",
      message: `${activeBuild.species.name} faints under incoming damage.`,
      ...battleState(),
    });
    pokemonFainted += 1;
    activeIndex += 1;
    activeBuild = team[activeIndex];
    if (!activeBuild) {
      return false;
    }
    activeHp = calculateEffectiveStats(
      activeBuild.species,
      activeBuild.level,
    ).hp;
    activeMaxHp = activeHp;
    energy = 0;
    switches += 1;
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: "player",
      kind: "switch",
      message: `${activeBuild.species.name} enters as backup. Third slot remains unavailable.`,
      ...battleState(),
    });
    if (config.pauseAfterSwitchTurns > 0) {
      rocketPausedUntilTurn = turn + config.pauseAfterSwitchTurns;
      events.push({
        turn,
        wallClockSeconds: turn * 0.5,
        actor: "rocket",
        kind: "pause",
        message: `${lineup.trainerName} pauses for ${config.pauseAfterSwitchTurns} turn(s) after the player switch.`,
        ...battleState(),
      });
    }
    return true;
  }

  function finish(outcome: "win" | "loss"): BattleResult {
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: "system",
      kind: "battle-end",
      message:
        outcome === "win"
          ? `${lead.species.name} / ${backup.species.name} clear the selected branch.`
          : `${lead.species.name} / ${backup.species.name} do not clear the selected branch before the two-slot limit.`,
      ...battleState(),
    });

    return {
      outcome,
      totalTurns: turn,
      wallClockSeconds: turn * 0.5,
      pokemonUsed: activeIndex + 1,
      pokemonFainted,
      shieldsUsed: shieldsUsed + playerShieldsUsed,
      chargedAttacksUsed,
      fastAttacksUsed,
      switches,
      playerDecisions: chargedAttacksUsed,
      assumptionsUsed: [
        `Experimental simulation for ${lineup.trainerName}; selected first listed Pokemon in each Rocket slot.`,
        "Rocket opponent HP and incoming damage use versioned assumptions, not sourced battle stats.",
        "Rocket opponent Charged Attack timing uses a configurable placeholder cadence; buffs, debuffs, type-specific opponent defense, and exact scaling are not implemented.",
        `Third slot unavailable; strategy=${strategy}.`,
      ],
      simulationVersion: "m2-experimental-rocket-0.1.0",
      events,
    };
  }

  function battleState() {
    return {
      playerHp: Math.max(0, Math.ceil(activeHp)),
      playerMaxHp: Math.ceil(activeMaxHp),
      playerTypes: activeBuild?.species.types ?? lead.species.types,
      opponentHp: Math.max(0, Math.ceil(opponentHp)),
      opponentMaxHp: Math.ceil(opponentMaxHp),
      opponentTypes: currentOpponent?.types ?? ["normal"],
    };
  }
}

function experimentalRocketConfig(
  lineup: RocketLineup,
  mechanics: MechanicsSnapshot,
  rocketOpponents: PokemonSpecies[],
  moves: MovesSnapshot | undefined,
) {
  const value = (key: string, fallback: number) =>
    mechanics.values.find((item) => item.key === key)?.value ?? fallback;
  const classKey =
    lineup.trainerClass === "giovanni"
      ? "giovanni"
      : lineup.trainerClass === "leader"
        ? "leader"
        : "grunt";
  const shieldKey =
    classKey === "giovanni"
      ? "rocket_giovanni_shields"
      : classKey === "leader"
        ? "rocket_leader_shields"
        : "rocket_grunt_shields";

  const opponentById = new Map(
    rocketOpponents.map((opponent) => [opponent.id, opponent]),
  );
  const fastMoveById = new Map(
    moves?.fastMoves.map((move) => [move.id, move]) ?? [],
  );
  const chargedMoveById = new Map(
    moves?.chargedMoves.map((move) => [move.id, move]) ?? [],
  );

  return {
    chargedAttackTurns: Math.max(
      0.5,
      value("charged_attack_registration_turns", 0.5),
    ),
    opponentChargedAttackIntervalTurns: Math.max(
      1,
      Math.round(value("rocket_opponent_charged_attack_interval", 18)),
    ),
    incomingDamagePerTurn: value(
      `rocket_incoming_damage_per_turn_${classKey}`,
      2,
    ),
    opponentChargedAttackDamage: value(
      "rocket_opponent_charged_attack_damage",
      35,
    ),
    pauseAfterChargedTurns: Math.round(
      value("rocket_pause_after_charged_attack", 0) / 0.5,
    ),
    pauseAfterSwitchTurns: value("rocket_pause_after_player_switch", 1.5),
    playerShields: Math.round(value("player_shields", 2)),
    remainingShields: Math.round(
      value(shieldKey, classKey === "grunt" ? 0 : 2),
    ),
    opponents: lineup.slots.map((slot) => ({
      id: slot.pokemonIds[0],
      name:
        opponentById.get(slot.pokemonIds[0])?.name ??
        formatPokemonId(slot.pokemonIds[0]),
      species: opponentById.get(slot.pokemonIds[0]),
      types: opponentById.get(slot.pokemonIds[0])?.types ??
        knownRocketOpponentTypes[slot.pokemonIds[0]] ?? ["normal"],
      fastMoves:
        opponentById
          .get(slot.pokemonIds[0])
          ?.fastMoves.map((id) => fastMoveById.get(id))
          .filter((move): move is FastMove => Boolean(move)) ?? [],
      chargedMoves:
        opponentById
          .get(slot.pokemonIds[0])
          ?.chargedMoves.map((id) => chargedMoveById.get(id))
          .filter((move): move is ChargedMove => Boolean(move)) ?? [],
      hp: value(`rocket_opponent_hp_slot_${slot.slot}`, 100 + slot.slot * 25),
    })),
  };
}

type ExperimentalRocketOpponent = ReturnType<
  typeof experimentalRocketConfig
>["opponents"][number];

function playerFastDamage(
  build: PokemonBuild,
  opponent: ExperimentalRocketOpponent,
) {
  return playerMoveDamage(build, build.fastMove, opponent);
}

function playerChargedDamage(
  build: PokemonBuild,
  move: ChargedMove,
  opponent: ExperimentalRocketOpponent,
) {
  return playerMoveDamage(build, move, opponent);
}

function playerMoveDamage(
  build: PokemonBuild,
  move: FastMove | ChargedMove,
  opponent: ExperimentalRocketOpponent,
) {
  return Math.max(
    1,
    move.power *
      stabMultiplier(move.type, build.species.types) *
      typeEffectiveness(move.type, opponent.types),
  );
}

function worstOpponentFastMove(
  opponent: ExperimentalRocketOpponent,
  defender: PokemonBuild,
) {
  return opponent.fastMoves.sort(
    (a, b) =>
      opponentMoveDamage(opponent, b, defender) / b.turns -
      opponentMoveDamage(opponent, a, defender) / a.turns,
  )[0];
}

function worstOpponentChargedMove(
  opponent: ExperimentalRocketOpponent,
  defender: PokemonBuild,
) {
  return opponent.chargedMoves.sort(
    (a, b) =>
      opponentMoveDamage(opponent, b, defender) -
      opponentMoveDamage(opponent, a, defender),
  )[0];
}

function opponentMoveDamage(
  opponent: ExperimentalRocketOpponent,
  move: FastMove | ChargedMove,
  defender: PokemonBuild,
) {
  const attackerAttack = opponent.species
    ? calculateEffectiveStats(opponent.species, defender.level).attack
    : defender.level;
  const defenderDefense = calculateEffectiveStats(
    defender.species,
    defender.level,
  ).defense;
  const modifiers =
    stabMultiplier(move.type, opponent.types) *
    typeEffectiveness(move.type, defender.species.types);

  return Math.max(
    1,
    Math.floor(
      0.5 * move.power * (attackerAttack / defenderDefense) * modifiers,
    ) + 1,
  );
}

function formatPokemonId(id: string) {
  return id
    .split(/[-_]/)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function clampHp(hp: number) {
  return Math.max(0, hp);
}
