import type { ChargedMove } from '../../data/schemas/moves'
import type { MechanicsSnapshot } from '../../data/schemas/mechanics'
import type { RocketLineup } from '../../data/schemas/rocket'
import type { PokemonBuild } from '../pokemon/types'
import { calculateEffectiveStats } from '../stats/effectiveStats'
import { stabMultiplier } from '../types/effectiveness'
import type { BattleResult, BattleStrategy } from './types'

export function createNotSimulatedResult(reason: string): BattleResult {
  return {
    outcome: 'not-simulated',
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
    simulationVersion: 'm1-interface-only',
    events: [
      {
        turn: 0,
        wallClockSeconds: 0,
        actor: 'system',
        kind: 'battle-end',
        message:
          'Milestone 1 exposes battle interfaces only. Rocket simulator results are not yet implemented.',
      },
    ],
  }
}

export function simulatePlayerOffensePreview({
  lead,
  backup,
  strategy,
  maxTurns = 60,
}: {
  lead: PokemonBuild
  backup: PokemonBuild
  strategy: BattleStrategy
  maxTurns?: number
}): BattleResult {
  const events: BattleResult['events'] = [
    {
      turn: 0,
      wallClockSeconds: 0,
      actor: 'player',
      kind: 'pokemon-enter',
      message: `${lead.species.name} enters as lead. ${backup.species.name} is available as backup, but no opponent damage is simulated.`,
    },
  ]
  let turn = 0
  let energy = 0
  let fastAttacksUsed = 0
  let chargedAttacksUsed = 0

  while (turn + lead.fastMove.turns <= maxTurns) {
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: 'player',
      kind: 'fast-start',
      message: `${lead.species.name} starts ${lead.fastMove.name}.`,
    })
    turn += lead.fastMove.turns
    energy = Math.min(100, energy + lead.fastMove.energyGain)
    fastAttacksUsed += 1
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: 'player',
      kind: 'fast-resolve',
      message: `${lead.fastMove.name} resolves; energy is ${energy}.`,
    })

    const chargedMove = selectChargedMove(lead, energy, strategy)
    if (chargedMove) {
      energy -= chargedMove.energyCost
      chargedAttacksUsed += 1
      events.push({
        turn,
        wallClockSeconds: turn * 0.5,
        actor: 'player',
        kind: 'charged-attack',
        message: `${lead.species.name} uses ${chargedMove.name}; energy is ${energy}.`,
      })
    }
  }

  events.push({
    turn,
    wallClockSeconds: turn * 0.5,
    actor: 'system',
    kind: 'battle-end',
    message:
      'Player offense preview ended. Rocket HP, damage, shields, pauses, fainting, and win/loss are not simulated yet.',
  })

  return {
    outcome: 'not-simulated',
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
      'Player-side offense preview only.',
      'Rocket opponent HP, damage, shields, pauses, fainting, switching, and win/loss are disabled.',
      `${strategy} selects charged attacks from available energy without opponent type effects.`,
    ],
    simulationVersion: 'm2-player-offense-preview-0.1.0',
    events,
  }
}

function selectChargedMove(
  build: PokemonBuild,
  energy: number,
  strategy: BattleStrategy,
): ChargedMove | undefined {
  const available = build.chargedMoves.filter((move) => move.energyCost <= energy)
  if (available.length === 0) {
    return undefined
  }

  if (strategy === 'fastest-expected-knockout' || strategy === 'minimal-interaction') {
    return available.sort((a, b) => adjustedPower(build, b) - adjustedPower(build, a))[0]
  }

  return available.sort(
    (a, b) =>
      a.energyCost - b.energyCost ||
      adjustedPower(build, b) / b.energyCost - adjustedPower(build, a) / a.energyCost,
  )[0]
}

function adjustedPower(build: PokemonBuild, move: ChargedMove) {
  return move.power * stabMultiplier(move.type, build.species.types)
}

export function simulateRocketLineupExperimental({
  lead,
  backup,
  lineup,
  mechanics,
  strategy,
  maxTurns = 240,
}: {
  lead: PokemonBuild
  backup: PokemonBuild
  lineup: RocketLineup
  mechanics: MechanicsSnapshot
  strategy: BattleStrategy
  maxTurns?: number
}): BattleResult {
  const config = experimentalRocketConfig(lineup, mechanics)
  const team = [lead, backup]
  let activeIndex = 0
  let activeBuild = team[activeIndex]
  let activeHp = calculateEffectiveStats(activeBuild.species, activeBuild.level).hp
  let energy = 0
  let turn = 0
  let fastAttacksUsed = 0
  let chargedAttacksUsed = 0
  let shieldsUsed = 0
  let switches = 0
  let pokemonFainted = 0
  let currentOpponentIndex = 0
  let currentOpponent = config.opponents[currentOpponentIndex]
  let opponentHp = currentOpponent.hp
  const events: BattleResult['events'] = [
    {
      turn: 0,
      wallClockSeconds: 0,
      actor: 'player',
      kind: 'pokemon-enter',
      message: `${activeBuild.species.name} enters against ${lineup.trainerName}'s ${currentOpponent.name}.`,
    },
  ]

  while (turn < maxTurns && currentOpponent && activeBuild) {
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: 'player',
      kind: 'fast-start',
      message: `${activeBuild.species.name} starts ${activeBuild.fastMove.name}.`,
    })

    turn += activeBuild.fastMove.turns
    fastAttacksUsed += 1
    energy = Math.min(100, energy + activeBuild.fastMove.energyGain)
    opponentHp -= fastDamage(activeBuild)
    activeHp -= config.incomingDamagePerTurn * activeBuild.fastMove.turns

    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: 'player',
      kind: 'fast-resolve',
      message: `${activeBuild.fastMove.name} resolves; ${currentOpponent.name} proxy HP is ${Math.max(0, Math.ceil(opponentHp))}.`,
    })
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: 'rocket',
      kind: 'fast-resolve',
      message: `${currentOpponent.name} attacks; ${activeBuild.species.name} proxy HP is ${Math.max(0, Math.ceil(activeHp))}.`,
    })

    if (opponentHp <= 0) {
      const nextOpponent = advanceOpponent()
      if (!nextOpponent) {
        return finish('win')
      }
      continue
    }

    if (activeHp <= 0) {
      if (!switchToBackup()) {
        return finish('loss')
      }
      continue
    }

    const chargedMove = selectChargedMove(activeBuild, energy, strategy)
    if (chargedMove) {
      energy -= chargedMove.energyCost
      chargedAttacksUsed += 1

      if (config.remainingShields > 0) {
        config.remainingShields -= 1
        shieldsUsed += 1
        events.push({
          turn,
          wallClockSeconds: turn * 0.5,
          actor: 'rocket',
          kind: 'shield',
          message: `${lineup.trainerName} shields ${chargedMove.name}; ${config.remainingShields} shield(s) remain.`,
        })
      } else {
        opponentHp -= chargedDamage(activeBuild, chargedMove)
        events.push({
          turn,
          wallClockSeconds: turn * 0.5,
          actor: 'player',
          kind: 'charged-attack',
          message: `${activeBuild.species.name} uses ${chargedMove.name}; ${currentOpponent.name} proxy HP is ${Math.max(0, Math.ceil(opponentHp))}.`,
        })
      }

      if (config.pauseAfterChargedTurns > 0) {
        events.push({
          turn,
          wallClockSeconds: turn * 0.5,
          actor: 'rocket',
          kind: 'pause',
          message: `${lineup.trainerName} pauses for ${config.pauseAfterChargedTurns} turn(s) after the player Charged Attack.`,
        })
      }

      if (opponentHp <= 0) {
        const nextOpponent = advanceOpponent()
        if (!nextOpponent) {
          return finish('win')
        }
      }
    }
  }

  return finish(currentOpponent ? 'loss' : 'win')

  function advanceOpponent() {
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: 'rocket',
      kind: 'faint',
      message: `${currentOpponent.name} faints under experimental proxy HP.`,
    })
    currentOpponentIndex += 1
    currentOpponent = config.opponents[currentOpponentIndex]
    if (!currentOpponent) {
      return undefined
    }
    opponentHp = currentOpponent.hp
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: 'rocket',
      kind: 'pokemon-enter',
      message: `${lineup.trainerName} sends in ${currentOpponent.name}.`,
    })
    return currentOpponent
  }

  function switchToBackup() {
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: 'player',
      kind: 'faint',
      message: `${activeBuild.species.name} faints under proxy incoming damage.`,
    })
    pokemonFainted += 1
    activeIndex += 1
    activeBuild = team[activeIndex]
    if (!activeBuild) {
      return false
    }
    activeHp = calculateEffectiveStats(activeBuild.species, activeBuild.level).hp
    energy = 0
    switches += 1
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: 'player',
      kind: 'switch',
      message: `${activeBuild.species.name} enters as backup. Third slot remains unavailable.`,
    })
    return true
  }

  function finish(outcome: 'win' | 'loss'): BattleResult {
    events.push({
      turn,
      wallClockSeconds: turn * 0.5,
      actor: 'system',
      kind: 'battle-end',
      message:
        outcome === 'win'
          ? `${lead.species.name} / ${backup.species.name} clear the selected proxy branch.`
          : `${lead.species.name} / ${backup.species.name} do not clear the selected proxy branch before the two-slot limit.`,
    })

    return {
      outcome,
      totalTurns: turn,
      wallClockSeconds: turn * 0.5,
      pokemonUsed: activeIndex + 1,
      pokemonFainted,
      shieldsUsed,
      chargedAttacksUsed,
      fastAttacksUsed,
      switches,
      playerDecisions: chargedAttacksUsed,
      assumptionsUsed: [
        `Experimental proxy simulation for ${lineup.trainerName}; selected first listed Pokemon in each Rocket slot.`,
        'Rocket opponent HP and incoming damage use versioned proxy assumptions, not sourced battle stats.',
        'Rocket move timing, opponent charged attacks, buffs, debuffs, type-specific opponent defense, and exact scaling are not implemented.',
        `Third slot unavailable; strategy=${strategy}.`,
      ],
      simulationVersion: 'm2-experimental-rocket-proxy-0.1.0',
      events,
    }
  }
}

function experimentalRocketConfig(lineup: RocketLineup, mechanics: MechanicsSnapshot) {
  const value = (key: string, fallback: number) =>
    mechanics.values.find((item) => item.key === key)?.value ?? fallback
  const classKey =
    lineup.trainerClass === 'giovanni'
      ? 'giovanni'
      : lineup.trainerClass === 'leader'
        ? 'leader'
        : 'grunt'
  const shieldKey =
    classKey === 'giovanni'
      ? 'rocket_giovanni_shields'
      : classKey === 'leader'
        ? 'rocket_leader_shields'
        : 'rocket_grunt_shields'

  return {
    incomingDamagePerTurn: value(`rocket_incoming_damage_per_turn_${classKey}`, 2),
    pauseAfterChargedTurns: Math.round(value('rocket_pause_after_charged_attack', 0) / 0.5),
    remainingShields: Math.round(value(shieldKey, classKey === 'grunt' ? 0 : 2)),
    opponents: lineup.slots.map((slot) => ({
      name: formatPokemonId(slot.pokemonIds[0]),
      hp: value(`rocket_opponent_hp_slot_${slot.slot}`, 100 + slot.slot * 25),
    })),
  }
}

function fastDamage(build: PokemonBuild) {
  return Math.max(1, build.fastMove.power * stabMultiplier(build.fastMove.type, build.species.types))
}

function chargedDamage(build: PokemonBuild, move: ChargedMove) {
  return Math.max(1, move.power * stabMultiplier(move.type, build.species.types))
}

function formatPokemonId(id: string) {
  return id
    .split(/[-_]/)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}
