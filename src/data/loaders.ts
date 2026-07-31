import pokemonJson from './generated/pokemon.json'
import movesJson from './generated/moves.json'
import rocketJson from './generated/rocket-lineups.json'
import mechanicsJson from './generated/mechanics.json'
import metadataJson from './generated/metadata.json'
import {
  type MechanicsSnapshot,
  mechanicsSnapshotSchema,
} from './schemas/mechanics'
import { type MetadataSnapshot, metadataSnapshotSchema } from './schemas/metadata'
import { type MovesSnapshot, movesSnapshotSchema } from './schemas/moves'
import { type PokemonSnapshot, pokemonSnapshotSchema } from './schemas/pokemon'
import {
  type RocketLineupSnapshot,
  rocketLineupSnapshotSchema,
} from './schemas/rocket'

export type ApplicationData = {
  pokemon: PokemonSnapshot
  moves: MovesSnapshot
  rocket: RocketLineupSnapshot
  mechanics: MechanicsSnapshot
  metadata: MetadataSnapshot
}

export function loadApplicationData(): ApplicationData {
  return {
    pokemon: pokemonSnapshotSchema.parse(pokemonJson),
    moves: movesSnapshotSchema.parse(movesJson),
    rocket: rocketLineupSnapshotSchema.parse(rocketJson),
    mechanics: mechanicsSnapshotSchema.parse(mechanicsJson),
    metadata: metadataSnapshotSchema.parse(metadataJson),
  }
}
