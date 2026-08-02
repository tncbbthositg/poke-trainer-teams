import {
  type MechanicsSnapshot,
  mechanicsSnapshotSchema,
} from "./schemas/mechanics";
import { type MetadataSnapshot, metadataSnapshotSchema } from "./schemas/metadata";
import { type MovesSnapshot, movesSnapshotSchema } from "./schemas/moves";
import { type PokemonSnapshot, pokemonSnapshotSchema } from "./schemas/pokemon";
import {
  type RocketLineupSnapshot,
  rocketLineupSnapshotSchema,
} from "./schemas/rocket";

export type ApplicationData = {
  pokemon: PokemonSnapshot;
  moves: MovesSnapshot;
  rocket: RocketLineupSnapshot;
  mechanics: MechanicsSnapshot;
  metadata: MetadataSnapshot;
};

export async function loadApplicationDataAsync(): Promise<ApplicationData> {
  const [pokemonJson, movesJson, rocketJson, mechanicsJson, metadataJson] =
    await Promise.all([
      import("./generated/pokemon.json"),
      import("./generated/moves.json"),
      import("./generated/rocket-lineups.json"),
      import("./generated/mechanics.json"),
      import("./generated/metadata.json"),
    ]);

  return {
    pokemon: pokemonSnapshotSchema.parse(pokemonJson.default),
    moves: movesSnapshotSchema.parse(movesJson.default),
    rocket: rocketLineupSnapshotSchema.parse(rocketJson.default),
    mechanics: mechanicsSnapshotSchema.parse(mechanicsJson.default),
    metadata: metadataSnapshotSchema.parse(metadataJson.default),
  };
}
