import { writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { sha256, nowIso } from './shared'

const pvpokeUrl =
  'https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json'
const parserVersion = 'pvpoke-normalizer-0.1.0'
const candidates = [
  { sourceId: 'kingambit', displayName: 'Kingambit' },
  { sourceId: 'annihilape', displayName: 'Annihilape' },
  { sourceId: 'lucario', displayName: 'Lucario' },
  { sourceId: 'terrakion', displayName: 'Terrakion' },
  { sourceId: 'swampert', displayName: 'Swampert' },
  { sourceId: 'groudon', displayName: 'Groudon' },
  { sourceId: 'mewtwo', displayName: 'Mewtwo' },
  { sourceId: 'melmetal', displayName: 'Melmetal' },
  {
    sourceId: 'morpeko_full_belly',
    displayName: 'Morpeko',
    note: 'PvPoke models Morpeko as form-specific entries; Full Belly is the Milestone 1 display form.',
  },
  { sourceId: 'greninja', displayName: 'Greninja' },
  { sourceId: 'dragonite', displayName: 'Dragonite' },
  { sourceId: 'garchomp', displayName: 'Garchomp' },
  { sourceId: 'togekiss', displayName: 'Togekiss' },
  { sourceId: 'metagross', displayName: 'Metagross' },
  { sourceId: 'excadrill', displayName: 'Excadrill' },
  { sourceId: 'tyranitar', displayName: 'Tyranitar' },
  { sourceId: 'machamp', displayName: 'Machamp' },
  { sourceId: 'rhyperior', displayName: 'Rhyperior' },
  { sourceId: 'kartana', displayName: 'Kartana' },
  { sourceId: 'xurkitree', displayName: 'Xurkitree' },
  { sourceId: 'reshiram', displayName: 'Reshiram' },
  { sourceId: 'zekrom', displayName: 'Zekrom' },
  { sourceId: 'kyogre', displayName: 'Kyogre' },
  { sourceId: 'rayquaza', displayName: 'Rayquaza' },
  { sourceId: 'dialga', displayName: 'Dialga' },
  { sourceId: 'palkia', displayName: 'Palkia' },
  { sourceId: 'landorus_therian', displayName: 'Landorus' },
  { sourceId: 'poliwrath', displayName: 'Poliwrath' },
  { sourceId: 'obstagoon', displayName: 'Obstagoon' },
  { sourceId: 'charizard', displayName: 'Charizard' },
  { sourceId: 'venusaur', displayName: 'Venusaur' },
  { sourceId: 'gyarados', displayName: 'Gyarados' },
  { sourceId: 'primarina', displayName: 'Primarina' },
]

type PvPokeMove = {
  moveId: string
  name: string
  type: string
  power: number
  energy?: number
  energyGain?: number
  cooldown?: number
  turns?: number
  buffs?: [number, number]
  buffTarget?: 'self' | 'opponent' | 'both'
  buffApplyChance?: string | number
}

type PvPokePokemon = {
  dex: number
  speciesName: string
  speciesId: string
  baseStats: { atk: number; def: number; hp: number }
  types: string[]
  fastMoves: string[]
  chargedMoves: string[]
  tags?: string[]
}

type PvPokeGameMaster = {
  timestamp: string
  pokemon: PvPokePokemon[]
  moves: PvPokeMove[]
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  const body = `${JSON.stringify(value, null, 2)}\n`
  await writeFile(path, body)
}

async function main() {
  const response = await fetch(pvpokeUrl)
  if (!response.ok) {
    throw new Error(`PvPoke fetch failed: ${response.status} ${response.statusText}`)
  }
  const raw = await response.text()
  const sourceHash = sha256(raw)
  const gameMaster = JSON.parse(raw) as PvPokeGameMaster
  const generatedAt = nowIso()
  const provenance = {
    sourceName: 'PvPoke GameMaster',
    sourceUrl: pvpokeUrl,
    retrievedAt: generatedAt,
    sourceVersion: gameMaster.timestamp,
    parserVersion,
    license: 'MIT; attribution required in Rocket Pair Lab methodology and README',
    category: 'sourced',
    notes: 'Normalized Trainer Battle data from PvPoke source data; rankings are not imported.',
  }

  const byMoveId = new Map(gameMaster.moves.map((move) => [move.moveId, move]))
  const normalizedCandidates = candidates.map((candidate) => {
    const species = gameMaster.pokemon.find(
      (pokemon) => pokemon.speciesId === candidate.sourceId,
    )
    if (!species) {
      throw new Error(`Candidate ${candidate.sourceId} not found in PvPoke GameMaster`)
    }
    return {
      id: species.speciesId,
      dex: species.dex,
      name: candidate.displayName,
      types: species.types.filter((type) => type !== 'none'),
      baseStats: {
        attack: species.baseStats.atk,
        defense: species.baseStats.def,
        stamina: species.baseStats.hp,
      },
      fastMoves: species.fastMoves,
      chargedMoves: species.chargedMoves,
      tags: species.tags ?? [],
      provenance: candidate.note
        ? {
            ...provenance,
            notes: `${provenance.notes} ${candidate.note}`,
          }
        : provenance,
    }
  })

  const legalMoveIds = new Set<string>()
  for (const species of normalizedCandidates) {
    species.fastMoves.forEach((move) => legalMoveIds.add(move))
    species.chargedMoves.forEach((move) => legalMoveIds.add(move))
  }

  const fastMoves = Array.from(legalMoveIds)
    .map((id) => byMoveId.get(id))
    .filter((move): move is PvPokeMove => Boolean(move))
    .filter((move) => (move.energyGain ?? 0) > 0)
    .map((move) => ({
      id: move.moveId,
      name: move.name,
      type: move.type,
      power: move.power,
      energyGain: move.energyGain ?? 0,
      turns: move.turns ?? Math.max(1, Math.round((move.cooldown ?? 500) / 500)),
      cooldownMs: move.cooldown ?? 0,
      buffs: normalizeBuff(move),
      provenance,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const chargedMoves = Array.from(legalMoveIds)
    .map((id) => byMoveId.get(id))
    .filter((move): move is PvPokeMove => Boolean(move))
    .filter((move) => (move.energy ?? 0) > 0)
    .map((move) => ({
      id: move.moveId,
      name: move.name,
      type: move.type,
      power: move.power,
      energyCost: move.energy ?? 0,
      buffs: normalizeBuff(move),
      provenance,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const pokemonSnapshot = {
    schemaVersion: '1.0.0',
    generatedAt,
    sourceHash,
    candidates: normalizedCandidates,
  }
  const movesSnapshot = {
    schemaVersion: '1.0.0',
    generatedAt,
    sourceHash,
    fastMoves,
    chargedMoves,
  }

  await writeJson('public/data/pokemon.json', pokemonSnapshot)
  await writeJson('public/data/moves.json', movesSnapshot)
  await writeJson('src/data/generated/pokemon.json', pokemonSnapshot)
  await writeJson('src/data/generated/moves.json', movesSnapshot)
  await writeFile(
    'public/data/pvpoke-update-summary.md',
    [
      '# PvPoke Update Summary',
      '',
      `Generated: ${generatedAt}`,
      `Source timestamp: ${gameMaster.timestamp}`,
      `Source hash: ${sourceHash}`,
      `Candidates: ${normalizedCandidates.length}`,
      `Fast moves: ${fastMoves.length}`,
      `Charged moves: ${chargedMoves.length}`,
      '',
    ].join('\n'),
  )
}

function normalizeBuff(move: PvPokeMove) {
  if (!move.buffs || !move.buffTarget) {
    return undefined
  }
  return {
    target: move.buffTarget,
    stages: move.buffs,
    chance: Number(move.buffApplyChance ?? 0),
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
