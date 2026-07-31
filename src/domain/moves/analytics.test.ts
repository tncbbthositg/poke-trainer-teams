import { describe, expect, it } from 'vitest'
import { loadApplicationData } from '../../data/loaders'
import { analyzeFastMove, chargeTiming } from './analytics'

describe('move analytics', () => {
  const data = loadApplicationData()
  const swampert = data.pokemon.candidates.find((pokemon) => pokemon.id === 'swampert')!
  const mudShot = data.moves.fastMoves.find((move) => move.id === 'MUD_SHOT')!
  const hydroCannon = data.moves.chargedMoves.find((move) => move.id === 'HYDRO_CANNON')!

  it('calculates DPT and EPT from Trainer Battle move fields', () => {
    const analytics = analyzeFastMove(swampert, mudShot)
    expect(analytics.damagePerTurn).toBe(mudShot.power / mudShot.turns)
    expect(analytics.energyPerTurn).toBe(mudShot.energyGain / mudShot.turns)
    expect(analytics.durationSeconds).toBe(mudShot.turns * 0.5)
  })

  it('uses discrete fast move counts and preserves leftover energy', () => {
    const timing = chargeTiming(mudShot, hydroCannon)
    expect(timing.firstFastMoveCount).toBe(Math.ceil(hydroCannon.energyCost / mudShot.energyGain))
    expect(timing.firstTurns).toBe(timing.firstFastMoveCount * mudShot.turns)
    expect(timing.leftoverEnergyAfterFirst).toBe(
      timing.firstFastMoveCount * mudShot.energyGain - hydroCannon.energyCost,
    )
    expect(timing.repeatFastMoveCount).toBe(
      Math.ceil((hydroCannon.energyCost - timing.leftoverEnergyAfterFirst) / mudShot.energyGain),
    )
  })
})
