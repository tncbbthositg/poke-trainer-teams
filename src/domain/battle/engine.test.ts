import { describe, expect, it } from 'vitest'
import { loadApplicationData } from '../../data/loaders'
import type { PokemonBuild } from '../pokemon/types'
import {
  createNotSimulatedResult,
  simulatePlayerOffensePreview,
  simulateRocketLineupExperimental,
} from './engine'

describe('battle engine interface scaffold', () => {
  it('returns deterministic not-simulated results without using slot three', () => {
    const a = createNotSimulatedResult('test boundary')
    const b = createNotSimulatedResult('test boundary')
    expect(a).toEqual(b)
    expect(a.outcome).toBe('not-simulated')
    expect(a.pokemonUsed).toBe(0)
    expect(a.assumptionsUsed).toContain('test boundary')
  })

  it('previews deterministic player-side offense without claiming win/loss', () => {
    const data = loadApplicationData()
    const mewtwo = buildFor(data, 'mewtwo', 'PSYCHO_CUT', 'PSYSTRIKE', 'FLAMETHROWER')
    const swampert = buildFor(data, 'swampert', 'MUD_SHOT', 'HYDRO_CANNON', 'EARTHQUAKE')

    const a = simulatePlayerOffensePreview({
      lead: mewtwo,
      backup: swampert,
      strategy: 'charge-asap',
      maxTurns: 20,
    })
    const b = simulatePlayerOffensePreview({
      lead: mewtwo,
      backup: swampert,
      strategy: 'charge-asap',
      maxTurns: 20,
    })

    expect(a).toEqual(b)
    expect(a.outcome).toBe('not-simulated')
    expect(a.simulationVersion).toBe('m2-player-offense-preview-0.1.0')
    expect(a.fastAttacksUsed).toBe(10)
    expect(a.chargedAttacksUsed).toBe(2)
    expect(a.pokemonUsed).toBe(1)
    expect(a.pokemonFainted).toBe(0)
    expect(a.assumptionsUsed.join(' ')).toMatch(/win\/loss are disabled/)
    expect(a.events.some((event) => event.kind === 'charged-attack')).toBe(true)
  })

  it('runs an experimental Rocket proxy branch with shields and two-slot limit', () => {
    const data = loadApplicationData()
    const mewtwo = buildFor(data, 'mewtwo', 'PSYCHO_CUT', 'PSYSTRIKE', 'FLAMETHROWER')
    const swampert = buildFor(data, 'swampert', 'MUD_SHOT', 'HYDRO_CANNON', 'EARTHQUAKE')
    const lineup = data.rocket.lineups.find((item) => item.id === 'leader-arlo-2026-07-31')!

    const result = simulateRocketLineupExperimental({
      lead: mewtwo,
      backup: swampert,
      lineup,
      mechanics: data.mechanics,
      strategy: 'charge-asap',
    })

    expect(['win', 'loss']).toContain(result.outcome)
    expect(result.simulationVersion).toBe('m2-experimental-rocket-proxy-0.1.0')
    expect(result.pokemonUsed).toBeLessThanOrEqual(2)
    expect(result.shieldsUsed).toBeLessThanOrEqual(2)
    expect(result.assumptionsUsed.join(' ')).toMatch(/proxy simulation/)
    expect(result.assumptionsUsed.join(' ')).toMatch(/Third slot unavailable/)
    expect(result.events.some((event) => event.kind === 'shield')).toBe(true)
  })
})

function buildFor(
  data: ReturnType<typeof loadApplicationData>,
  speciesId: string,
  fastMoveId: string,
  chargedOneId: string,
  chargedTwoId: string,
): PokemonBuild {
  const species = data.pokemon.candidates.find((candidate) => candidate.id === speciesId)
  const fastMove = data.moves.fastMoves.find((move) => move.id === fastMoveId)
  const chargedOne = data.moves.chargedMoves.find((move) => move.id === chargedOneId)
  const chargedTwo = data.moves.chargedMoves.find((move) => move.id === chargedTwoId)

  if (!species || !fastMove || !chargedOne || !chargedTwo) {
    throw new Error(`Missing test build data for ${speciesId}`)
  }

  return {
    species,
    level: 40,
    ivs: { attack: 15, defense: 15, stamina: 15 },
    shadow: false,
    bestBuddy: false,
    fastMove,
    chargedMoves: [chargedOne, chargedTwo],
  }
}
