import { describe, expect, it } from 'vitest'
import { loadApplicationData } from '../../data/loaders'
import {
  bestMovesetForStrategy,
  rankPokemonForFocus,
  type PokemonFocusStrategy,
} from './pokemonFocus'

describe('pokemon focus ranking', () => {
  const data = loadApplicationData()
  const strategies: PokemonFocusStrategy[] = [
    'fastest-victory',
    'charged-pause-control',
  ]

  it.each(strategies)('ranks every candidate for %s', (strategy) => {
    const rankings = rankPokemonForFocus(data.pokemon.candidates, data.moves, strategy)

    expect(rankings).toHaveLength(data.pokemon.candidates.length)
    expect(rankings.map((ranking) => ranking.rank)).toEqual(
      data.pokemon.candidates.map((_, index) => index + 1),
    )
    expect(rankings.at(0)?.score).toBeGreaterThanOrEqual(rankings.at(-1)?.score ?? 0)
    expect(rankings.every((ranking) => ranking.reason.length > 0)).toBe(true)
  })

  it('recommends legal moves for the chosen species', () => {
    const swampert = data.pokemon.candidates.find((pokemon) => pokemon.id === 'swampert')!
    const moveset = bestMovesetForStrategy(swampert, data.moves, 'charged-pause-control')

    expect(swampert.fastMoves).toContain(moveset.fastMove.id)
    expect(swampert.chargedMoves).toContain(moveset.chargedMoves[0].id)
    expect(swampert.chargedMoves).toContain(moveset.chargedMoves[1].id)
    expect(moveset.firstChargeTurns).toBeGreaterThan(0)
    expect(moveset.repeatChargeTurns).toBeGreaterThan(0)
  })

  it('orders recommended charged moves by cost, then STAB-adjusted DPE', () => {
    const mewtwo = data.pokemon.candidates.find((pokemon) => pokemon.id === 'mewtwo')!
    const moveset = bestMovesetForStrategy(mewtwo, data.moves, 'charged-pause-control')

    expect(moveset.chargedMoves[0].id).toBe('PSYSTRIKE')
    expect(moveset.chargedMoves[1].id).toBe('FLAMETHROWER')
  })
})
