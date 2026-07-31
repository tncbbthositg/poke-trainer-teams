import type { BattleResult } from './types'

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
