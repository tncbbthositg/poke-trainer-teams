import type {
  ChargedMove,
  FastMove,
  MovesSnapshot,
} from "../../data/schemas/moves";
import type {
  MechanicsSnapshot,
  MechanicsValue,
} from "../../data/schemas/mechanics";
import type { PokemonSpecies, PokemonType } from "../../data/schemas/pokemon";
import type { RocketLineup } from "../../data/schemas/rocket";
import type { PokemonBuild } from "../pokemon/types";
import { calculateEffectiveStats } from "../stats/effectiveStats";
import { stabMultiplier, typeEffectiveness } from "../types/effectiveness";
import { calculateRocketEffectiveStats } from "./rocketStats";
import type { BattleResult, BattleStrategy } from "./types";

const FALLBACK_TRAINER_BATTLE_DAMAGE_MULTIPLIER = 1.3;

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
    confidence: "not-simulated",
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
    confidence: "not-simulated",
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
  context?: {
    opponent: ExperimentalRocketOpponent;
    opponentHp: number;
    remainingOpponentShields: number;
  },
): ChargedMove | undefined {
  const available = build.chargedMoves.filter(
    (move) => move.energyCost <= energy,
  );
  if (available.length === 0) {
    return undefined;
  }

  if (context) {
    return selectMatchupChargedMove(build, energy, strategy, context);
  }

  if (
    strategy === "fastest-expected-knockout" ||
    strategy === "minimal-interaction"
  ) {
    return [...available].sort(
      (a, b) => adjustedPower(build, b) - adjustedPower(build, a),
    )[0];
  }

  return [...available].sort(
    (a, b) =>
      a.energyCost - b.energyCost ||
      adjustedPower(build, b) / b.energyCost -
        adjustedPower(build, a) / a.energyCost,
  )[0];
}

function selectMatchupChargedMove(
  build: PokemonBuild,
  energy: number,
  strategy: BattleStrategy,
  {
    opponent,
    opponentHp,
    remainingOpponentShields,
  }: {
    opponent: ExperimentalRocketOpponent;
    opponentHp: number;
    remainingOpponentShields: number;
  },
): ChargedMove | undefined {
  const available = build.chargedMoves.filter(
    (move) => move.energyCost <= energy,
  );
  if (available.length === 0) {
    return undefined;
  }

  const fastDamage = playerMoveDamageDetails(
    build,
    build.fastMove,
    opponent,
  ).totalDamage;
  if (remainingOpponentShields === 0 && fastDamage >= opponentHp) {
    return undefined;
  }

  if (remainingOpponentShields > 0) {
    return [...available].sort(
      (a, b) =>
        a.energyCost - b.energyCost ||
        matchupDamage(build, b, opponent) - matchupDamage(build, a, opponent),
    )[0];
  }

  const knockoutMoves = available.filter(
    (move) => matchupDamage(build, move, opponent) >= opponentHp,
  );
  if (knockoutMoves.length > 0) {
    return knockoutMoves.sort(
      (a, b) =>
        a.energyCost - b.energyCost ||
        matchupDamage(build, a, opponent) - matchupDamage(build, b, opponent),
    )[0];
  }

  if (strategy === "charge-asap") {
    return [...available].sort(
      (a, b) =>
        a.energyCost - b.energyCost ||
        matchupDamage(build, b, opponent) / b.energyCost -
          matchupDamage(build, a, opponent) / a.energyCost,
    )[0];
  }

  if (strategy === "shield-breaker") {
    return [...available].sort(
      (a, b) =>
        matchupDamage(build, b, opponent) / b.energyCost -
          matchupDamage(build, a, opponent) / a.energyCost ||
        a.energyCost - b.energyCost,
    )[0];
  }

  const allMovesByExpectedKoPressure = [...build.chargedMoves].sort(
    (a, b) =>
      chargedMovePressure(build, b, opponent, energy) -
        chargedMovePressure(build, a, opponent, energy) ||
      a.energyCost - b.energyCost,
  );
  const bestMove = allMovesByExpectedKoPressure[0];
  if (bestMove && bestMove.energyCost <= energy) {
    return bestMove;
  }

  if (strategy === "preserve-lead") {
    return [...available].sort(
      (a, b) =>
        matchupDamage(build, b, opponent) - matchupDamage(build, a, opponent) ||
        a.energyCost - b.energyCost,
    )[0];
  }

  return undefined;
}

function chargedMovePressure(
  build: PokemonBuild,
  move: ChargedMove,
  opponent: ExperimentalRocketOpponent,
  currentEnergy: number,
) {
  const missingEnergy = Math.max(0, move.energyCost - currentEnergy);
  const fastMovesNeeded = Math.ceil(missingEnergy / build.fastMove.energyGain);
  const turnsUntilMove = fastMovesNeeded * build.fastMove.turns;
  return matchupDamage(build, move, opponent) / Math.max(1, turnsUntilMove + 1);
}

function matchupDamage(
  build: PokemonBuild,
  move: FastMove | ChargedMove,
  opponent: ExperimentalRocketOpponent,
) {
  return playerMoveDamageDetails(build, move, opponent).totalDamage;
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
    lead.level,
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
      wallClockSeconds: wallClockSeconds(),
      actor: "player",
      kind: "pokemon-enter",
      message: `${activeBuild.species.name} enters against ${lineup.trainerName}'s ${currentOpponent.name}.`,
      ...battleState(),
    },
  ];

  while (turn < maxTurns && currentOpponent && activeBuild) {
    const actionStartTurn = turn;
    const rocketWillAttack = actionStartTurn >= rocketPausedUntilTurn;
    const opponentFastMove = currentOpponent.fastMove;
    const playerFastDetails = playerMoveDamageDetails(
      activeBuild,
      activeBuild.fastMove,
      currentOpponent,
    );
    const opponentFastDetails = opponentFastMove
      ? opponentMoveDamageDetails(
          currentOpponent,
          opponentFastMove,
          activeBuild,
        )
      : undefined;
    events.push({
      turn,
      wallClockSeconds: wallClockSeconds(),
      actor: "player",
      kind: "fast-start",
      message: `${activeBuild.species.name} starts ${activeBuild.fastMove.name}.`,
      moveType: activeBuild.fastMove.type,
      attack: playerFastDetails,
      ...battleState(),
    });
    if (rocketWillAttack) {
      events.push({
        turn,
        wallClockSeconds: wallClockSeconds(),
        actor: "rocket",
        kind: "fast-start",
        message: `${currentOpponent.name} starts ${opponentFastMove?.name ?? "attacking"}.`,
        moveType: opponentFastMove?.type,
        attack: opponentFastDetails,
        ...battleState(),
      });
    }

    turn += activeBuild.fastMove.turns;
    fastAttacksUsed += 1;
    energy = Math.min(100, energy + activeBuild.fastMove.energyGain);
    opponentHp = clampHp(opponentHp - playerFastDetails.totalDamage);
    if (rocketWillAttack) {
      activeHp = clampHp(
        activeHp -
          (opponentFastDetails?.totalDamage ??
            config.incomingDamagePerTurn * activeBuild.fastMove.turns),
      );
    }

    events.push({
      turn,
      wallClockSeconds: wallClockSeconds(),
      actor: "player",
      kind: "fast-resolve",
      message: `${activeBuild.fastMove.name} resolves; ${currentOpponent.name} HP is ${Math.max(0, Math.ceil(opponentHp))}.`,
      moveType: activeBuild.fastMove.type,
      attack: playerFastDetails,
      ...battleState(),
    });
    if (rocketWillAttack) {
      events.push({
        turn,
        wallClockSeconds: wallClockSeconds(),
        actor: "rocket",
        kind: "fast-resolve",
        message: `${currentOpponent.name} uses ${opponentFastMove?.name ?? "attack"}; ${activeBuild.species.name} HP is ${Math.max(0, Math.ceil(activeHp))}.`,
        moveType: opponentFastMove?.type,
        attack: opponentFastDetails,
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
      const opponentChargedMove = currentOpponent.chargedMove;
      const opponentChargedDetails = opponentChargedMove
        ? opponentMoveDamageDetails(
            currentOpponent,
            opponentChargedMove,
            activeBuild,
          )
        : undefined;
      chargedAttacksUsed += 1;
      const playerShielded = remainingPlayerShields > 0;
      if (playerShielded) {
        remainingPlayerShields -= 1;
        playerShieldsUsed += 1;
      } else {
        activeHp = clampHp(
          activeHp -
            (opponentChargedDetails?.totalDamage ??
              config.opponentChargedAttackDamage),
        );
      }
      events.push({
        turn,
        wallClockSeconds: wallClockSeconds(),
        actor: "rocket",
        kind: "charged-attack",
        message: playerShielded
          ? `${currentOpponent.name} uses ${opponentChargedMove?.name ?? "Charged Attack"}; player shields.`
          : `${currentOpponent.name} uses ${opponentChargedMove?.name ?? "Charged Attack"}; ${activeBuild.species.name} HP is ${Math.max(0, Math.ceil(activeHp))}.`,
        moveType:
          opponentChargedMove?.type ?? currentOpponent.types[0] ?? "normal",
        attack: opponentChargedDetails,
        durationTurns: config.chargedAttackTurns,
        ...battleState(),
      });
      if (playerShielded) {
        events.push({
          turn,
          wallClockSeconds: wallClockSeconds(),
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

    const chargedMove = selectChargedMove(activeBuild, energy, strategy, {
      opponent: currentOpponent,
      opponentHp,
      remainingOpponentShields: config.remainingShields,
    });
    if (chargedMove) {
      energy -= chargedMove.energyCost;
      chargedAttacksUsed += 1;
      const chargedAttackTurns = config.chargedAttackTurns;
      const playerChargedDetails = playerMoveDamageDetails(
        activeBuild,
        chargedMove,
        currentOpponent,
      );

      if (config.remainingShields > 0) {
        config.remainingShields -= 1;
        shieldsUsed += 1;
        events.push({
          turn,
          wallClockSeconds: wallClockSeconds(),
          actor: "player",
          kind: "charged-attack",
          message: `${activeBuild.species.name} uses ${chargedMove.name}; ${lineup.trainerName} shields.`,
          moveType: chargedMove.type,
          attack: playerChargedDetails,
          durationTurns: chargedAttackTurns,
          ...battleState(),
        });
        events.push({
          turn,
          wallClockSeconds: wallClockSeconds(),
          actor: "rocket",
          kind: "shield",
          message: `${lineup.trainerName} shields ${chargedMove.name}; ${config.remainingShields} shield(s) remain.`,
          durationTurns: chargedAttackTurns,
          ...battleState(),
        });
      } else {
        opponentHp = clampHp(opponentHp - playerChargedDetails.totalDamage);
        events.push({
          turn,
          wallClockSeconds: wallClockSeconds(),
          actor: "player",
          kind: "charged-attack",
          message: `${activeBuild.species.name} uses ${chargedMove.name}; ${currentOpponent.name} HP is ${Math.max(0, Math.ceil(opponentHp))}.`,
          moveType: chargedMove.type,
          attack: playerChargedDetails,
          durationTurns: chargedAttackTurns,
          ...battleState(),
        });
      }

      turn += chargedAttackTurns;

      if (config.pauseAfterChargedTurns > 0) {
        rocketPausedUntilTurn = turn + config.pauseAfterChargedTurns;
        events.push({
          turn,
          wallClockSeconds: wallClockSeconds(),
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
      wallClockSeconds: wallClockSeconds(),
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
      wallClockSeconds: wallClockSeconds(),
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
      wallClockSeconds: wallClockSeconds(),
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
      wallClockSeconds: wallClockSeconds(),
      actor: "player",
      kind: "switch",
      message: `${activeBuild.species.name} enters as backup. Third slot remains unavailable.`,
      ...battleState(),
    });
    if (config.pauseAfterSwitchTurns > 0) {
      rocketPausedUntilTurn = turn + config.pauseAfterSwitchTurns;
      events.push({
        turn,
        wallClockSeconds: wallClockSeconds(),
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
      wallClockSeconds: wallClockSeconds(),
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
      wallClockSeconds: wallClockSeconds(),
      pokemonUsed: Math.min(team.length, activeIndex + 1),
      pokemonFainted,
      shieldsUsed: shieldsUsed + playerShieldsUsed,
      chargedAttacksUsed,
      fastAttacksUsed,
      switches,
      playerDecisions: chargedAttacksUsed,
      confidence: "proxy-estimate",
      assumptionsUsed: [
        `Proxy estimate for ${lineup.trainerName}; selected first listed Pokemon in each Rocket slot.`,
        "Outcome is not a verified Rocket win/loss until simulator output is compared against recorded real battles.",
        "Rocket opponent HP, Attack, Defense, shield counts, ordered send-ins, and NPC pause windows use source-backed mechanics.",
        `Mechanics used: ${config.mechanicsUsed.join(" ")}`,
        ...config.fallbackAssumptions,
        "Player Charged Attack decisions use current opponent HP, type effectiveness, and remaining Rocket shields, but exact Rocket shield AI is still unverified.",
        "Rocket move pools are sourced, but this deterministic branch selects the first available Rocket fast move and first available Rocket charged move instead of modeling random move assignment.",
        "Rocket opponent Charged Attack timing uses a configurable placeholder cadence; buffs, debuffs, random move assignment probabilities, and live battle validation are not implemented.",
        `Third slot unavailable; strategy=${strategy}.`,
      ],
      simulationVersion: "m2-experimental-rocket-0.3.0",
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

  function wallClockSeconds() {
    return turn * config.turnSeconds;
  }
}

function experimentalRocketConfig(
  lineup: RocketLineup,
  mechanics: MechanicsSnapshot,
  rocketOpponents: PokemonSpecies[],
  moves: MovesSnapshot | undefined,
  trainerLevel: number,
) {
  const mechanicsByKey = new Map(
    mechanics.values.map((item) => [item.key, item]),
  );
  const value = (key: string, fallback: number) =>
    mechanicsByKey.get(key)?.value ?? fallback;
  const mechanicSummary = (key: string, fallback: number) => {
    const mechanic = mechanicsByKey.get(key);
    if (mechanic) {
      return formatMechanicSummary(mechanic);
    }
    return `${formatMechanicKey(key)} fallback=${fallback}.`;
  };
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
  const turnSeconds = value("battle_turn_seconds", 0.5);
  const fallbackHpKeys = lineup.slots.map(
    (slot) => `rocket_opponent_hp_slot_${slot.slot}`,
  );
  const opponents = lineup.slots.map((slot) => {
    const species = opponentById.get(slot.pokemonIds[0]);
    const stats = species
      ? calculateRocketEffectiveStats({
          species,
          trainerLevel,
          trainerClass: lineup.trainerClass,
        })
      : undefined;
    const fastMoves =
      species?.fastMoves
        .map((id) => fastMoveById.get(id))
        .filter((move): move is FastMove => Boolean(move)) ?? [];
    const chargedMoves =
      species?.chargedMoves
        .map((id) => chargedMoveById.get(id))
        .filter((move): move is ChargedMove => Boolean(move)) ?? [];
    const fallbackHp = value(
      `rocket_opponent_hp_slot_${slot.slot}`,
      100 + slot.slot * 25,
    );

    return {
      id: slot.pokemonIds[0],
      name: species?.name ?? formatPokemonId(slot.pokemonIds[0]),
      species,
      types: species?.types ??
        knownRocketOpponentTypes[slot.pokemonIds[0]] ?? ["normal"],
      fastMoves,
      chargedMoves,
      fastMove: fastMoves[0],
      chargedMove: chargedMoves[0],
      stats,
      hp: stats?.hp ?? fallbackHp,
      damageMultiplier: value(
        "trainer_battle_damage_multiplier",
        FALLBACK_TRAINER_BATTLE_DAMAGE_MULTIPLIER,
      ),
      usesFallbackStats: !stats,
      usesFallbackFastDamage: fastMoves.length === 0,
      usesFallbackChargedDamage: chargedMoves.length === 0,
    };
  });
  const fallbackAssumptions = opponents.flatMap((opponent, index) => {
    const slotNumber = index + 1;
    const assumptions: string[] = [];
    if (opponent.usesFallbackStats) {
      assumptions.push(
        `Slot ${slotNumber} ${opponent.name} uses fallback HP because normalized Rocket species stats are unavailable.`,
      );
    }
    if (opponent.usesFallbackFastDamage) {
      assumptions.push(
        `Slot ${slotNumber} ${opponent.name} uses fallback incoming damage per turn because no sourced Rocket fast move is available.`,
      );
    }
    if (opponent.usesFallbackChargedDamage) {
      assumptions.push(
        `Slot ${slotNumber} ${opponent.name} uses fallback Charged Attack damage because no sourced Rocket charged move is available.`,
      );
    }
    return assumptions;
  });

  return {
    turnSeconds,
    chargedAttackTurns: Math.max(
      0.5,
      value("charged_attack_registration_turns", 0.5),
    ),
    damageMultiplier: value(
      "trainer_battle_damage_multiplier",
      FALLBACK_TRAINER_BATTLE_DAMAGE_MULTIPLIER,
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
      value("rocket_pause_after_charged_attack", 0) / turnSeconds,
    ),
    pauseAfterSwitchTurns: value("rocket_pause_after_player_switch", 4),
    playerShields: Math.round(value("player_shields", 2)),
    remainingShields: Math.round(
      value(shieldKey, classKey === "grunt" ? 0 : 2),
    ),
    opponents,
    mechanicsUsed: [
      mechanicSummary("battle_turn_seconds", 0.5),
      mechanicSummary(
        "trainer_battle_damage_multiplier",
        FALLBACK_TRAINER_BATTLE_DAMAGE_MULTIPLIER,
      ),
      mechanicSummary("charged_attack_registration_turns", 0.5),
      mechanicSummary("rocket_opponent_charged_attack_interval", 18),
      mechanicSummary("rocket_pause_after_charged_attack", 0),
      mechanicSummary("rocket_pause_after_player_switch", 4),
      mechanicSummary("player_shields", 2),
      mechanicSummary(shieldKey, classKey === "grunt" ? 0 : 2),
      ...fallbackHpKeys.map((key, index) =>
        opponents[index]?.usesFallbackStats
          ? mechanicSummary(key, 100 + (index + 1) * 25)
          : `Slot ${index + 1} Rocket HP uses sourced Rocket effective stamina.`,
      ),
    ],
    fallbackAssumptions,
  };
}

function formatMechanicSummary(mechanic: MechanicsValue) {
  return `${mechanic.label}: ${mechanic.value} ${mechanic.unit} (${mechanic.category}).`;
}

function formatMechanicKey(key: string) {
  return key.replaceAll("_", " ");
}

type ExperimentalRocketOpponent = ReturnType<
  typeof experimentalRocketConfig
>["opponents"][number];

function playerMoveDamageDetails(
  build: PokemonBuild,
  move: FastMove | ChargedMove,
  opponent: ExperimentalRocketOpponent,
) {
  const attackerAttack = calculateEffectiveStats(
    build.species,
    build.level,
  ).attack;
  const defenderDefense = opponent.stats?.defense ?? attackerAttack;
  const stab = stabMultiplier(move.type, build.species.types);
  const type = typeEffectiveness(move.type, opponent.types);
  const baseDamage =
    Math.floor(
      0.5 *
        move.power *
        (attackerAttack / defenderDefense) *
        opponent.damageMultiplier,
    ) + 1;
  const afterStab = baseDamage * stab;
  const totalDamage = Math.max(
    1,
    Math.floor(
      0.5 *
        move.power *
        (attackerAttack / defenderDefense) *
        opponent.damageMultiplier *
        stab *
        type,
    ) + 1,
  );

  return {
    name: move.name,
    baseDamage,
    stabBonus: afterStab - baseDamage,
    typeBonus: totalDamage - afterStab,
    totalDamage,
    stabMultiplier: stab,
    typeMultiplier: type,
  };
}

function opponentMoveDamageDetails(
  opponent: ExperimentalRocketOpponent,
  move: FastMove | ChargedMove,
  defender: PokemonBuild,
) {
  const attackerAttack = opponent.stats?.attack ?? defender.level;
  const defenderDefense = calculateEffectiveStats(
    defender.species,
    defender.level,
  ).defense;
  const stab = stabMultiplier(move.type, opponent.types);
  const type = typeEffectiveness(move.type, defender.species.types);
  const baseDamage =
    Math.floor(
      0.5 *
        move.power *
        (attackerAttack / defenderDefense) *
        opponent.damageMultiplier,
    ) + 1;
  const afterStab = baseDamage * stab;
  const totalDamage = Math.max(
    1,
    Math.floor(
      0.5 *
        move.power *
        (attackerAttack / defenderDefense) *
        opponent.damageMultiplier *
        stab *
        type,
    ) + 1,
  );

  return {
    name: move.name,
    baseDamage,
    stabBonus: afterStab - baseDamage,
    typeBonus: totalDamage - afterStab,
    totalDamage,
    stabMultiplier: stab,
    typeMultiplier: type,
  };
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
