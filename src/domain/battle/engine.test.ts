import { describe, expect, it } from 'vitest'
import { createNotSimulatedResult } from './engine'

describe('battle engine interface scaffold', () => {
  it('returns deterministic not-simulated results without using slot three', () => {
    const a = createNotSimulatedResult('test boundary')
    const b = createNotSimulatedResult('test boundary')
    expect(a).toEqual(b)
    expect(a.outcome).toBe('not-simulated')
    expect(a.pokemonUsed).toBe(0)
    expect(a.assumptionsUsed).toContain('test boundary')
  })
})
