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
import { calculateTrainerBattleDamage } from "./damage";
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
    playerAttackStage: number;
    playerDefenseStage: number;
    opponentAttackStage: number;
    opponentDefenseStage: number;
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
    playerAttackStage,
    playerDefenseStage,
    opponentAttackStage,
    opponentDefenseStage,
  }: {
    opponent: ExperimentalRocketOpponent;
    opponentHp: number;
    remainingOpponentShields: number;
    playerAttackStage: number;
    playerDefenseStage: number;
    opponentAttackStage: number;
    opponentDefenseStage: number;
  },
): ChargedMove | undefined {
  const available = build.chargedMoves.filter(
    (move) => move.energyCost <= energy,
  );
  if (available.length === 0) {
    return undefined;
  }

  const fastDamage = playerMoveDamageDetails(build, build.fastMove, opponent, {
    attackerAttackStage: playerAttackStage,
    defenderDefenseStage: opponentDefenseStage,
  }).totalDamage;
  if (remainingOpponentShields === 0 && fastDamage >= opponentHp) {
    return undefined;
  }

  if (remainingOpponentShields > 0) {
    return [...available].sort(
      (a, b) =>
        shieldedChargedMoveUtility(build, b, opponent, {
          playerAttackStage,
          playerDefenseStage,
          opponentAttackStage,
          opponentDefenseStage,
        }) -
          shieldedChargedMoveUtility(build, a, opponent, {
            playerAttackStage,
            playerDefenseStage,
            opponentAttackStage,
            opponentDefenseStage,
          }) || a.energyCost - b.energyCost,
    )[0];
  }

  const knockoutMoves = available.filter(
    (move) =>
      matchupDamage(build, move, opponent, {
        playerAttackStage,
        opponentDefenseStage,
      }) >= opponentHp,
  );
  if (knockoutMoves.length > 0) {
    return knockoutMoves.sort(
      (a, b) =>
        a.energyCost - b.energyCost ||
        matchupDamage(build, a, opponent, {
          playerAttackStage,
          opponentDefenseStage,
        }) -
          matchupDamage(build, b, opponent, {
            playerAttackStage,
            opponentDefenseStage,
          }),
    )[0];
  }

  if (strategy === "charge-asap") {
    return [...available].sort(
      (a, b) =>
        chargedMoveUtility(build, b, opponent, {
          playerAttackStage,
          playerDefenseStage,
          opponentAttackStage,
          opponentDefenseStage,
          strategy,
        }) -
          chargedMoveUtility(build, a, opponent, {
            playerAttackStage,
            playerDefenseStage,
            opponentAttackStage,
            opponentDefenseStage,
            strategy,
          }) || a.energyCost - b.energyCost,
    )[0];
  }

  if (strategy === "shield-breaker") {
    return [...available].sort(
      (a, b) =>
        chargedMoveUtility(build, b, opponent, {
          playerAttackStage,
          playerDefenseStage,
          opponentAttackStage,
          opponentDefenseStage,
          strategy,
        }) -
          chargedMoveUtility(build, a, opponent, {
            playerAttackStage,
            playerDefenseStage,
            opponentAttackStage,
            opponentDefenseStage,
            strategy,
          }) || a.energyCost - b.energyCost,
    )[0];
  }

  const allMovesByExpectedKoPressure = [...build.chargedMoves].sort(
    (a, b) =>
      chargedMovePressure(build, b, opponent, energy, {
        playerAttackStage,
        playerDefenseStage,
        opponentAttackStage,
        opponentDefenseStage,
      }) -
        chargedMovePressure(build, a, opponent, energy, {
          playerAttackStage,
          playerDefenseStage,
          opponentAttackStage,
          opponentDefenseStage,
        }) || a.energyCost - b.energyCost,
  );
  const bestMove = allMovesByExpectedKoPressure[0];
  if (bestMove && bestMove.energyCost <= energy) {
    return bestMove;
  }

  if (strategy === "preserve-lead") {
    return [...available].sort(
      (a, b) =>
        chargedMoveUtility(build, b, opponent, {
          playerAttackStage,
          playerDefenseStage,
          opponentAttackStage,
          opponentDefenseStage,
          strategy,
        }) -
          chargedMoveUtility(build, a, opponent, {
            playerAttackStage,
            playerDefenseStage,
            opponentAttackStage,
            opponentDefenseStage,
            strategy,
          }) || a.energyCost - b.energyCost,
    )[0];
  }

  return undefined;
}

function chargedMovePressure(
  build: PokemonBuild,
  move: ChargedMove,
  opponent: ExperimentalRocketOpponent,
  currentEnergy: number,
  stages: ChargedMoveDecisionStages,
) {
  const missingEnergy = Math.max(0, move.energyCost - currentEnergy);
  const fastMovesNeeded = Math.ceil(missingEnergy / build.fastMove.energyGain);
  const turnsUntilMove = fastMovesNeeded * build.fastMove.turns;
  return (
    chargedMoveUtility(build, move, opponent, {
      ...stages,
      strategy: "fastest-expected-knockout",
    }) / Math.max(1, turnsUntilMove + 1)
  );
}

function matchupDamage(
  build: PokemonBuild,
  move: FastMove | ChargedMove,
  opponent: ExperimentalRocketOpponent,
  stages: {
    playerAttackStage: number;
    opponentDefenseStage: number;
  } = { playerAttackStage: 0, opponentDefenseStage: 0 },
) {
  return playerMoveDamageDetails(build, move, opponent, {
    attackerAttackStage: stages.playerAttackStage,
    defenderDefenseStage: stages.opponentDefenseStage,
  }).totalDamage;
}

type ChargedMoveDecisionStages = {
  playerAttackStage: number;
  playerDefenseStage: number;
  opponentAttackStage: number;
  opponentDefenseStage: number;
};

function chargedMoveUtility(
  build: PokemonBuild,
  move: ChargedMove,
  opponent: ExperimentalRocketOpponent,
  context: ChargedMoveDecisionStages & { strategy: BattleStrategy },
) {
  const details = playerMoveDamageDetails(build, move, opponent, {
    attackerAttackStage: context.playerAttackStage,
    defenderDefenseStage: context.opponentDefenseStage,
  });
  const damagePerEnergy = details.totalDamage / move.energyCost;
  const offensiveBuff = guaranteedOffensiveStageValue(move, context);
  const defensiveBuff = guaranteedDefensiveStageValue(move, context);
  const buffValue =
    context.strategy === "preserve-lead"
      ? defensiveBuff * 1.35 + offensiveBuff
      : offensiveBuff * 1.25 + defensiveBuff * 0.7;

  if (context.strategy === "shield-breaker") {
    return damagePerEnergy * 32 + details.totalDamage * 0.28 + buffValue * 12;
  }

  if (context.strategy === "fastest-expected-knockout") {
    return details.totalDamage * 1.2 + damagePerEnergy * 12 + buffValue * 7;
  }

  return details.totalDamage + damagePerEnergy * 18 + buffValue * 9;
}

function shieldedChargedMoveUtility(
  build: PokemonBuild,
  move: ChargedMove,
  opponent: ExperimentalRocketOpponent,
  context: ChargedMoveDecisionStages,
) {
  const damage = playerMoveDamageDetails(build, move, opponent, {
    attackerAttackStage: context.playerAttackStage,
    defenderDefenseStage: context.opponentDefenseStage,
  }).totalDamage;
  const buffValue =
    guaranteedOffensiveStageValue(move, context) +
    guaranteedDefensiveStageValue(move, context);

  return 1000 / move.energyCost + buffValue * 18 + damage * 0.03;
}

function guaranteedOffensiveStageValue(
  move: ChargedMove,
  context: ChargedMoveDecisionStages,
) {
  if (!move.buffs || move.buffs.chance < 1) {
    return 0;
  }

  const [attackDelta, defenseDelta] = move.buffs.stages;
  let value = 0;
  if (move.buffs.target === "self" || move.buffs.target === "both") {
    value += positiveStageChangeValue(context.playerAttackStage, attackDelta);
  }
  if (move.buffs.target === "opponent" || move.buffs.target === "both") {
    value += positiveStageChangeValue(
      context.opponentDefenseStage,
      -defenseDelta,
    );
  }

  return value;
}

function guaranteedDefensiveStageValue(
  move: ChargedMove,
  context: ChargedMoveDecisionStages,
) {
  if (!move.buffs || move.buffs.chance < 1) {
    return 0;
  }

  const [attackDelta, defenseDelta] = move.buffs.stages;
  let value = 0;
  if (move.buffs.target === "self" || move.buffs.target === "both") {
    value += positiveStageChangeValue(context.playerDefenseStage, defenseDelta);
  }
  if (move.buffs.target === "opponent" || move.buffs.target === "both") {
    value += positiveStageChangeValue(
      context.opponentAttackStage,
      -attackDelta,
    );
  }

  return value;
}

function positiveStageChangeValue(currentStage: number, delta: number) {
  if (delta <= 0) {
    return 0;
  }

  return Math.max(
    0,
    clampStage(currentStage + delta) - clampStage(currentStage),
  );
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
  trainerLevel = lead.level,
  startWithSwap = false,
  maxTurns = 240,
}: {
  lead: PokemonBuild;
  backup: PokemonBuild;
  lineup: RocketLineup;
  mechanics: MechanicsSnapshot;
  rocketOpponents?: PokemonSpecies[];
  moves?: MovesSnapshot;
  strategy: BattleStrategy;
  trainerLevel?: number;
  startWithSwap?: boolean;
  maxTurns?: number;
}): BattleResult {
  const config = experimentalRocketConfig(
    lineup,
    mechanics,
    rocketOpponents,
    moves,
    trainerLevel,
  );
  const team = [lead, backup];
  const playerStates = team.map((build) => {
    const hp = calculateEffectiveStats(
      build.species,
      build.level,
      build.ivs,
    ).hp;
    return {
      hp,
      maxHp: hp,
      energy: 0,
      entered: false,
      fainted: false,
    };
  });
  let activeIndex = startWithSwap ? 1 : 0;
  let activeBuild = team[activeIndex];
  let playerAttackStage = 0;
  let playerDefenseStage = 0;
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
  let opponentEnergy = 0;
  let opponentAttackStage = 0;
  let opponentDefenseStage = 0;
  let remainingPlayerShields = config.playerShields;
  let nextFallbackRocketChargedTurn = config.opponentChargedAttackIntervalTurns;
  activeState().entered = true;
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

  if (startWithSwap) {
    switchToTeamMember(0, "opening-swap");
  }

  while (turn < maxTurns && currentOpponent && activeBuild) {
    const actionStartTurn = turn;
    const rocketWillAttack = actionStartTurn >= rocketPausedUntilTurn;
    const opponentFastMove = currentOpponent.fastMove;
    const playerFastDetails = playerMoveDamageDetails(
      activeBuild,
      activeBuild.fastMove,
      currentOpponent,
      {
        attackerAttackStage: playerAttackStage,
        defenderDefenseStage: opponentDefenseStage,
      },
    );
    const opponentFastDetails = opponentFastMove
      ? opponentMoveDamageDetails(
          currentOpponent,
          opponentFastMove,
          activeBuild,
          {
            attackerAttackStage: opponentAttackStage,
            defenderDefenseStage: playerDefenseStage,
          },
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
    activeState().energy = Math.min(
      100,
      activeState().energy + activeBuild.fastMove.energyGain,
    );
    opponentHp = clampHp(opponentHp - playerFastDetails.totalDamage);
    if (rocketWillAttack) {
      opponentEnergy = Math.min(
        100,
        opponentEnergy + (opponentFastMove?.energyGain ?? 0),
      );
      activeState().hp = clampHp(
        activeState().hp -
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
        message: `${currentOpponent.name} uses ${opponentFastMove?.name ?? "attack"}; ${activeBuild.species.name} HP is ${Math.max(0, Math.ceil(activeState().hp))}.`,
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

    if (activeState().hp <= 0) {
      if (!switchAfterFaint()) {
        return finish("loss");
      }
      continue;
    }

    const opponentChargedMove = selectOpponentChargedMove(
      currentOpponent,
      opponentEnergy,
      activeBuild,
    );
    const shouldUseFallbackChargedAttack =
      rocketWillAttack &&
      !opponentChargedMove &&
      currentOpponent.chargedMoves.length === 0 &&
      turn >= nextFallbackRocketChargedTurn;
    if (
      rocketWillAttack &&
      (opponentChargedMove || shouldUseFallbackChargedAttack)
    ) {
      const opponentChargedDetails = opponentChargedMove
        ? opponentMoveDamageDetails(
            currentOpponent,
            opponentChargedMove,
            activeBuild,
            {
              attackerAttackStage: opponentAttackStage,
              defenderDefenseStage: playerDefenseStage,
              shielded: remainingPlayerShields > 0,
            },
          )
        : undefined;
      if (opponentChargedMove) {
        opponentEnergy = Math.max(
          0,
          opponentEnergy - opponentChargedMove.energyCost,
        );
      }
      chargedAttacksUsed += 1;
      const playerShielded = remainingPlayerShields > 0;
      if (playerShielded) {
        remainingPlayerShields -= 1;
        playerShieldsUsed += 1;
        activeState().hp = clampHp(activeState().hp - 1);
      } else {
        activeState().hp = clampHp(
          activeState().hp -
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
          : `${currentOpponent.name} uses ${opponentChargedMove?.name ?? "Charged Attack"}; ${activeBuild.species.name} HP is ${Math.max(0, Math.ceil(activeState().hp))}.`,
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
      if (opponentChargedMove) {
        applyMoveStageEffects({
          move: opponentChargedMove,
          actor: "rocket",
          actorName: currentOpponent.name,
        });
      }
      turn += config.chargedAttackTurns;
      nextFallbackRocketChargedTurn =
        turn + config.opponentChargedAttackIntervalTurns;
      if (activeState().hp <= 0) {
        if (!switchAfterFaint()) {
          return finish("loss");
        }
        continue;
      }
    }

    const chargedMove = selectChargedMove(
      activeBuild,
      activeState().energy,
      strategy,
      {
        opponent: currentOpponent,
        opponentHp,
        remainingOpponentShields: config.remainingShields,
        playerAttackStage,
        playerDefenseStage,
        opponentAttackStage,
        opponentDefenseStage,
      },
    );
    if (chargedMove) {
      activeState().energy -= chargedMove.energyCost;
      chargedAttacksUsed += 1;
      const chargedAttackTurns = config.chargedAttackTurns;
      const playerChargedDetails = playerMoveDamageDetails(
        activeBuild,
        chargedMove,
        currentOpponent,
        {
          attackerAttackStage: playerAttackStage,
          defenderDefenseStage: opponentDefenseStage,
          shielded: config.remainingShields > 0,
        },
      );

      if (config.remainingShields > 0) {
        config.remainingShields -= 1;
        shieldsUsed += 1;
        opponentHp = clampHp(opponentHp - playerChargedDetails.totalDamage);
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

      applyMoveStageEffects({
        move: chargedMove,
        actor: "player",
        actorName: activeBuild.species.name,
      });
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
    opponentEnergy = 0;
    opponentAttackStage = 0;
    opponentDefenseStage = 0;
    nextFallbackRocketChargedTurn =
      turn + config.opponentChargedAttackIntervalTurns;
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

  function switchAfterFaint() {
    events.push({
      turn,
      wallClockSeconds: wallClockSeconds(),
      actor: "player",
      kind: "faint",
      message: `${activeBuild.species.name} faints under incoming damage.`,
      ...battleState(),
    });
    activeState().hp = 0;
    activeState().fainted = true;
    pokemonFainted += 1;
    const nextIndex = playerStates.findIndex(
      (state, index) => index !== activeIndex && !state.fainted && state.hp > 0,
    );
    if (nextIndex === -1) {
      return false;
    }
    switchToTeamMember(nextIndex, "faint-replacement");
    return true;
  }

  function switchToTeamMember(
    nextIndex: number,
    reason: "opening-swap" | "faint-replacement",
  ) {
    activeIndex = nextIndex;
    activeBuild = team[activeIndex];
    activeState().entered = true;
    playerAttackStage = 0;
    playerDefenseStage = 0;
    switches += 1;
    events.push({
      turn,
      wallClockSeconds: wallClockSeconds(),
      actor: "player",
      kind: "switch",
      message:
        reason === "opening-swap"
          ? `${activeBuild.species.name} enters after an opening player switch. ${backup.species.name} remains available; third slot remains unavailable.`
          : `${activeBuild.species.name} enters as the remaining Pokemon. Third slot remains unavailable.`,
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
      pokemonUsed: playerStates.filter((state) => state.entered).length,
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
        "Player Charged Attack decisions use current opponent HP, type effectiveness, remaining Rocket shields, and guaranteed stage-effect value, but exact Rocket shield AI is still unverified.",
        "Rocket move pools are sourced, but this deterministic branch selects the first available Rocket fast move and the highest-damage affordable Rocket charged move instead of modeling random move assignment.",
        "Rocket opponent Charged Attack timing uses sourced fast-move energy and charged-move costs when moves are available; the configurable placeholder cadence is only used when no sourced Rocket charged move is available.",
        "Guaranteed buffs and debuffs apply with Pokemon GO stage limits; chance-based effects, random move assignment probabilities, and live battle validation are not implemented.",
        ...(startWithSwap
          ? [
              "Opening player switch is enabled; the selected backup enters first, then the lead switches in at turn 0 and triggers the configured Rocket switch pause.",
            ]
          : []),
        `Third slot unavailable; strategy=${strategy}.`,
      ],
      simulationVersion: "m2-experimental-rocket-0.5.0",
      events,
    };
  }

  function battleState() {
    const state = activeState();
    return {
      playerHp: Math.max(0, Math.ceil(state.hp)),
      playerMaxHp: Math.ceil(state.maxHp),
      playerEnergy: state.energy,
      playerAttackStage,
      playerDefenseStage,
      playerTypes: activeBuild?.species.types ?? lead.species.types,
      opponentHp: Math.max(0, Math.ceil(opponentHp)),
      opponentMaxHp: Math.ceil(opponentMaxHp),
      opponentEnergy,
      opponentAttackStage,
      opponentDefenseStage,
      opponentTypes: currentOpponent?.types ?? ["normal"],
    };
  }

  function activeState() {
    return playerStates[activeIndex];
  }

  function applyMoveStageEffects({
    move,
    actor,
    actorName,
  }: {
    move: ChargedMove;
    actor: "player" | "rocket";
    actorName: string;
  }) {
    if (!move.buffs || move.buffs.chance < 1) {
      return;
    }

    const before = {
      playerAttackStage,
      playerDefenseStage,
      opponentAttackStage,
      opponentDefenseStage,
    };
    const [attackDelta, defenseDelta] = move.buffs.stages;
    const affectsSelf =
      move.buffs.target === "self" || move.buffs.target === "both";
    const affectsOpponent =
      move.buffs.target === "opponent" || move.buffs.target === "both";

    if (actor === "player") {
      if (affectsSelf) {
        playerAttackStage = clampStage(playerAttackStage + attackDelta);
        playerDefenseStage = clampStage(playerDefenseStage + defenseDelta);
      }
      if (affectsOpponent) {
        opponentAttackStage = clampStage(opponentAttackStage + attackDelta);
        opponentDefenseStage = clampStage(opponentDefenseStage + defenseDelta);
      }
    } else {
      if (affectsSelf) {
        opponentAttackStage = clampStage(opponentAttackStage + attackDelta);
        opponentDefenseStage = clampStage(opponentDefenseStage + defenseDelta);
      }
      if (affectsOpponent) {
        playerAttackStage = clampStage(playerAttackStage + attackDelta);
        playerDefenseStage = clampStage(playerDefenseStage + defenseDelta);
      }
    }

    if (
      before.playerAttackStage === playerAttackStage &&
      before.playerDefenseStage === playerDefenseStage &&
      before.opponentAttackStage === opponentAttackStage &&
      before.opponentDefenseStage === opponentDefenseStage
    ) {
      return;
    }

    events.push({
      turn,
      wallClockSeconds: wallClockSeconds(),
      actor,
      kind: "buff",
      message: `${actorName}'s ${move.name} applies guaranteed stage effects.`,
      moveType: move.type,
      ...battleState(),
    });
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
      aiChargedAttackQuality: value("rocket_ai_charged_attack_quality", 1),
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
      mechanicSummary("rocket_ai_charged_attack_quality", 1),
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

function selectOpponentChargedMove(
  opponent: ExperimentalRocketOpponent,
  energy: number,
  defender: PokemonBuild,
) {
  const available = opponent.chargedMoves.filter(
    (move) => move.energyCost <= energy,
  );
  if (available.length === 0) {
    return undefined;
  }

  return [...available].sort(
    (a, b) =>
      opponentMoveDamageDetails(opponent, b, defender, {
        attackerAttackStage: 0,
        defenderDefenseStage: 0,
      }).totalDamage -
        opponentMoveDamageDetails(opponent, a, defender, {
          attackerAttackStage: 0,
          defenderDefenseStage: 0,
        }).totalDamage || a.energyCost - b.energyCost,
  )[0];
}

function playerMoveDamageDetails(
  build: PokemonBuild,
  move: FastMove | ChargedMove,
  opponent: ExperimentalRocketOpponent,
  stages: {
    attackerAttackStage: number;
    defenderDefenseStage: number;
    shielded?: boolean;
  } = { attackerAttackStage: 0, defenderDefenseStage: 0 },
) {
  const attackerAttack = calculateEffectiveStats(
    build.species,
    build.level,
    build.ivs,
  ).attack;
  const defenderDefense = opponent.stats?.defense ?? attackerAttack;
  const stab = stabMultiplier(move.type, build.species.types);
  const type = typeEffectiveness(move.type, opponent.types);
  const damageMultiplier =
    opponent.damageMultiplier / FALLBACK_TRAINER_BATTLE_DAMAGE_MULTIPLIER;
  const baseDamage = calculateTrainerBattleDamage({
    movePower: move.power,
    attackerAttack,
    defenderDefense,
    attackerIsShadow: build.shadow,
    defenderIsShadow: true,
    attackStage: stages.attackerAttackStage,
    defenseStage: stages.defenderDefenseStage,
    otherApplicableModifiers: damageMultiplier,
    shielded: stages.shielded,
  });
  const afterStab = baseDamage * stab;
  const totalDamage = calculateTrainerBattleDamage({
    movePower: move.power,
    attackerAttack,
    defenderDefense,
    attackerIsShadow: build.shadow,
    defenderIsShadow: true,
    stab,
    effectiveness: type,
    attackStage: stages.attackerAttackStage,
    defenseStage: stages.defenderDefenseStage,
    otherApplicableModifiers: damageMultiplier,
    shielded: stages.shielded,
  });

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
  stages: {
    attackerAttackStage: number;
    defenderDefenseStage: number;
    shielded?: boolean;
  } = { attackerAttackStage: 0, defenderDefenseStage: 0 },
) {
  const attackerAttack = opponent.stats?.attack ?? defender.level;
  const defenderDefense = calculateEffectiveStats(
    defender.species,
    defender.level,
    defender.ivs,
  ).defense;
  const stab = stabMultiplier(move.type, opponent.types);
  const type = typeEffectiveness(move.type, defender.species.types);
  const chargedAttackQuality = isChargedMove(move)
    ? opponent.aiChargedAttackQuality
    : 1;
  const damageMultiplier =
    opponent.damageMultiplier / FALLBACK_TRAINER_BATTLE_DAMAGE_MULTIPLIER;
  const baseDamage = calculateTrainerBattleDamage({
    movePower: move.power,
    attackerAttack,
    defenderDefense,
    attackerIsShadow: true,
    defenderIsShadow: defender.shadow,
    attackStage: stages.attackerAttackStage,
    defenseStage: stages.defenderDefenseStage,
    chargedAttackQuality,
    otherApplicableModifiers: damageMultiplier,
    shielded: stages.shielded,
  });
  const afterStab = baseDamage * stab;
  const totalDamage = calculateTrainerBattleDamage({
    movePower: move.power,
    attackerAttack,
    defenderDefense,
    attackerIsShadow: true,
    defenderIsShadow: defender.shadow,
    stab,
    effectiveness: type,
    attackStage: stages.attackerAttackStage,
    defenseStage: stages.defenderDefenseStage,
    chargedAttackQuality,
    otherApplicableModifiers: damageMultiplier,
    shielded: stages.shielded,
  });

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

function clampStage(stage: number) {
  return Math.max(-4, Math.min(4, stage));
}

function isChargedMove(move: FastMove | ChargedMove): move is ChargedMove {
  return "energyCost" in move;
}
