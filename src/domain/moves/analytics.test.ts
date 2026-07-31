import { describe, expect, it } from 'vitest'
import { loadApplicationData } from '../../data/loaders'
import {
  analyzeFastMove,
  chargeTiming,
  neutralOutputPerFastMoveTurns,
  outputTimelinePerFastMoveTurns,
} from './analytics'

describe('move analytics', () => {
  const data = loadApplicationData()
  const swampert = data.pokemon.candidates.find((pokemon) => pokemon.id === 'swampert')!
  const mudShot = data.moves.fastMoves.find((move) => move.id === 'MUD_SHOT')!
  const hydroCannon = data.moves.chargedMoves.find((move) => move.id === 'HYDRO_CANNON')!

  it('calculates DPT and EPT from Trainer Battle move fields', () => {
    const analytics = analyzeFastMove(swampert, mudShot)
    expect(analytics.damagePerTurn).toBe((mudShot.power * 1.2) / mudShot.turns)
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

  it('calculates neutral move power over a fixed fast-move turn budget', () => {
    const output = neutralOutputPerFastMoveTurns(swampert, mudShot, hydroCannon, 100)
    const expectedFastUses = Math.floor(100 / mudShot.turns)
    const expectedChargedUses = Math.floor(
      (expectedFastUses * mudShot.energyGain) / hydroCannon.energyCost,
    )

    expect(output.fastMoveUses).toBe(expectedFastUses)
    expect(output.chargedMoveUses).toBe(expectedChargedUses)
    expect(output.totalPower).toBe(
      expectedFastUses * mudShot.power * 1.2 + expectedChargedUses * hydroCannon.power * 1.2,
    )
    expect(output.includesStab).toBe(true)
    expect(output.fastMoveHasStab).toBe(true)
    expect(output.chargedMoveHasStab).toBe(true)
  })

  it('builds a cumulative output timeline matching the 100-turn total', () => {
    const output = neutralOutputPerFastMoveTurns(swampert, mudShot, hydroCannon, 100)
    const timeline = outputTimelinePerFastMoveTurns(swampert, mudShot, hydroCannon, 100)

    expect(timeline.length).toBeGreaterThan(0)
    expect(timeline.at(-1)?.cumulativePower).toBeCloseTo(output.totalPower)
    expect(timeline.some((event) => event.kind === 'charged')).toBe(true)
  })
})
