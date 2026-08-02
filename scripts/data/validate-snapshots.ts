import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { battleObservationSnapshotSchema } from "../../src/data/schemas/battleObservations";
import { mechanicsSnapshotSchema } from "../../src/data/schemas/mechanics";
import { metadataSnapshotSchema } from "../../src/data/schemas/metadata";
import { movesSnapshotSchema } from "../../src/data/schemas/moves";
import { pokemonSnapshotSchema } from "../../src/data/schemas/pokemon";
import { rocketLineupSnapshotSchema } from "../../src/data/schemas/rocket";

async function parse(path: string) {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

async function hash(path: string) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

async function main() {
  const pokemon = pokemonSnapshotSchema.parse(
    await parse("public/data/pokemon.json"),
  );
  const moves = movesSnapshotSchema.parse(
    await parse("public/data/moves.json"),
  );
  const rocket = rocketLineupSnapshotSchema.parse(
    await parse("public/data/rocket-lineups.json"),
  );
  const battleObservations = battleObservationSnapshotSchema.parse(
    await parse("public/data/battle-observations.json"),
  );
  mechanicsSnapshotSchema.parse(await parse("public/data/mechanics.json"));
  metadataSnapshotSchema.parse(await parse("public/data/metadata.json"));

  const fastIds = new Set(moves.fastMoves.map((move) => move.id));
  const chargedIds = new Set(moves.chargedMoves.map((move) => move.id));
  for (const species of [...pokemon.candidates, ...pokemon.rocketOpponents]) {
    for (const move of species.fastMoves) {
      if (!fastIds.has(move)) {
        throw new Error(`${species.name} references unknown fast move ${move}`);
      }
    }
    for (const move of species.chargedMoves) {
      if (!chargedIds.has(move)) {
        throw new Error(
          `${species.name} references unknown charged move ${move}`,
        );
      }
    }
  }

  const duplicateIds = rocket.lineups
    .map((lineup) => lineup.id)
    .filter((id, index, ids) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new Error(`Duplicate Rocket lineup ids: ${duplicateIds.join(", ")}`);
  }

  const pokemonIds = new Set(
    [...pokemon.candidates, ...pokemon.rocketOpponents].map(
      (species) => species.id,
    ),
  );
  const missingLineupSpecies = rocket.lineups.flatMap((lineup) =>
    lineup.slots.flatMap((slot) =>
      slot.pokemonIds
        .filter((pokemonId) => !pokemonIds.has(pokemonId))
        .map((pokemonId) => `${lineup.id} slot ${slot.slot}: ${pokemonId}`),
    ),
  );
  if (missingLineupSpecies.length > 0) {
    throw new Error(
      `Rocket lineups reference unknown Pokemon ids:\n${missingLineupSpecies.join("\n")}`,
    );
  }

  const lineupIds = new Set(rocket.lineups.map((lineup) => lineup.id));
  for (const observation of battleObservations.observations) {
    if (!lineupIds.has(observation.lineupId)) {
      throw new Error(
        `${observation.id} references unknown lineup ${observation.lineupId}`,
      );
    }
    for (const pokemonId of [
      observation.lead.speciesId,
      observation.backup.speciesId,
      ...observation.opponentPokemonIds,
    ]) {
      if (!pokemonIds.has(pokemonId)) {
        throw new Error(
          `${observation.id} references unknown Pokemon ${pokemonId}`,
        );
      }
    }
    for (const fastMoveId of [
      observation.lead.fastMoveId,
      observation.backup.fastMoveId,
      ...observation.observedOpponentFastMoveIds,
    ]) {
      if (!fastIds.has(fastMoveId)) {
        throw new Error(
          `${observation.id} references unknown fast move ${fastMoveId}`,
        );
      }
    }
    for (const chargedMoveId of [
      ...observation.lead.chargedMoveIds,
      ...observation.backup.chargedMoveIds,
      ...observation.observedOpponentChargedMoveIds,
    ]) {
      if (!chargedIds.has(chargedMoveId)) {
        throw new Error(
          `${observation.id} references unknown charged move ${chargedMoveId}`,
        );
      }
    }
  }

  await assertMirroredSnapshot("battle-observations.json");
  await assertMirroredSnapshot("pokemon.json");
  await assertMirroredSnapshot("moves.json");
  await assertMirroredSnapshot("rocket-lineups.json");
  await assertMirroredSnapshot("mechanics.json");
  await assertMirroredSnapshot("metadata.json");

  console.log(
    `Validated ${pokemon.candidates.length} candidates, ${pokemon.rocketOpponents.length} Rocket opponents, ${moves.fastMoves.length} fast moves, ${moves.chargedMoves.length} charged moves, and ${rocket.lineups.length} Rocket lineups.`,
  );
}

async function assertMirroredSnapshot(file: string) {
  const publicHash = await hash(`public/data/${file}`);
  const generatedHash = await hash(`src/data/generated/${file}`);
  if (publicHash !== generatedHash) {
    throw new Error(
      `${file} differs between public/data and src/data/generated. Run yarn data:sync.`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
