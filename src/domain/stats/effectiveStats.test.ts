import { describe, expect, it } from 'vitest'
import { loadApplicationData } from '../../data/loaders'
import { calculateEffectiveStats } from './effectiveStats'

describe('calculateEffectiveStats', () => {
  it('calculates level 40 15/15/15 CP and effective stats for Lucario', () => {
    const data = loadApplicationData()
    const lucario = data.pokemon.candidates.find((pokemon) => pokemon.id === 'lucario')
    expect(lucario).toBeDefined()

    const stats = calculateEffectiveStats(lucario!, 40, {
      attack: 15,
      defense: 15,
      stamina: 15,
    })

    expect(stats.cp).toBe(2703)
    expect(stats.hp).toBe(147)
    expect(stats.attack).toBeCloseTo(198.365, 3)
    expect(stats.defense).toBeCloseTo(125.658, 3)
    expect(stats.rawBulkProxy).toBeCloseTo(stats.defense * stats.hp, 6)
  })
})
