import { describe, expect, it } from 'vitest'
import { hasStab, typeEffectiveness } from './effectiveness'

describe('type effectiveness', () => {
  it('calculates super effective, resisted, and double weakness multipliers', () => {
    expect(typeEffectiveness('water', ['ground'])).toBeCloseTo(1.6)
    expect(typeEffectiveness('water', ['grass'])).toBeCloseTo(0.625)
    expect(typeEffectiveness('ice', ['dragon', 'flying'])).toBeCloseTo(2.56)
  })

  it('detects STAB', () => {
    expect(hasStab('fighting', ['fighting', 'steel'])).toBe(true)
    expect(hasStab('fire', ['fighting', 'steel'])).toBe(false)
  })
})
