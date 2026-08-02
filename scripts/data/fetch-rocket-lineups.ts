import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import type { DataProvenance } from "../../src/data/schemas/provenance";
import type {
  RocketLineup,
  RocketLineupSnapshot,
} from "../../src/data/schemas/rocket";
import { rocketLineupSnapshotSchema } from "../../src/data/schemas/rocket";
import { nowIso } from "./shared";

const leekDuckUrl = "https://leekduck.com/rocket-lineups/";
const expectedLeekDuckVersion = "Updated on June 25, 2026";
const effectiveDate = "2026-06-25";
const parserVersion = "manual-leekduck-lineup-normalizer-0.1.0";

type SourceLineup = {
  id: string;
  trainerName: string;
  trainerClass: RocketLineup["trainerClass"];
  quote?: string;
  slots: [string[], string[], string[]];
};

const gruntLineups: SourceLineup[] = [
  {
    id: "grunt-normal-male-2026-06-25",
    trainerName: "Normal-type Male Grunt",
    trainerClass: "grunt",
    quote: "Normal does not mean weak.",
    slots: [
      ["teddiursa", "hoothoot", "porygon"],
      ["loudred", "stufful", "starly"],
      ["ursaring", "swellow", "kangaskhan"],
    ],
  },
  {
    id: "grunt-fire-female-2026-06-25",
    trainerName: "Fire-type Female Grunt",
    trainerClass: "grunt",
    quote: "Do you know how hot Pokemon fire breath can get?",
    slots: [
      ["litwick", "ponyta", "torchic"],
      ["magmar", "blaziken", "camerupt"],
      ["darmanitan_standard", "delphox", "magmortar"],
    ],
  },
  {
    id: "grunt-water-female-2026-06-25",
    trainerName: "Water-type Female Grunt",
    trainerClass: "grunt",
    quote: "These waters are treacherous!",
    slots: [
      ["mudkip", "tentacool", "krabby"],
      ["dewpider", "swampert", "sharpedo"],
      ["walrein", "greninja", "tentacruel"],
    ],
  },
  {
    id: "grunt-water-male-2026-06-25",
    trainerName: "Water-type Male Grunt",
    trainerClass: "grunt",
    quote: "These waters are treacherous!",
    slots: [
      ["magikarp", "feebas"],
      ["magikarp"],
      ["magikarp", "gyarados"],
    ],
  },
  {
    id: "grunt-electric-female-2026-06-25",
    trainerName: "Electric-type Female Grunt",
    trainerClass: "grunt",
    quote: "Get ready to be shocked!",
    slots: [
      ["voltorb", "shinx", "helioptile"],
      ["electabuzz", "voltorb", "geodude_alolan"],
      ["luxray", "ampharos", "galvantula"],
    ],
  },
  {
    id: "grunt-grass-male-2026-06-25",
    trainerName: "Grass-type Male Grunt",
    trainerClass: "grunt",
    quote: "Don't tangle with us!",
    slots: [
      ["phantump", "treecko", "tangela"],
      ["lileep", "sceptile", "morelull"],
      ["chesnaught", "trevenant", "cradily"],
    ],
  },
  {
    id: "grunt-ice-female-2026-06-25",
    trainerName: "Ice-type Female Grunt",
    trainerClass: "grunt",
    quote: "You're gonna be frozen in your tracks.",
    slots: [
      ["seel", "delibird", "spheal"],
      ["sealeo", "froslass", "ninetales_alolan"],
      ["aurorus", "froslass", "glalie"],
    ],
  },
  {
    id: "grunt-fighting-female-2026-06-25",
    trainerName: "Fighting-type Female Grunt",
    trainerClass: "grunt",
    quote: "This buff physique isn't just for show!",
    slots: [
      ["timburr", "mankey", "machop"],
      ["hitmontop", "hitmonlee", "hitmonchan"],
      ["conkeldurr", "annihilape", "infernape"],
    ],
  },
  {
    id: "grunt-poison-female-2026-06-25",
    trainerName: "Poison-type Female Grunt",
    trainerClass: "grunt",
    quote: "Coiled and ready to strike!",
    slots: [
      ["oddish", "zubat", "qwilfish"],
      ["weezing_galarian", "nidorino", "nidorina"],
      ["weezing", "toxicroak", "amoonguss"],
    ],
  },
  {
    id: "grunt-ground-male-2026-06-25",
    trainerName: "Ground-type Male Grunt",
    trainerClass: "grunt",
    quote: "You'll be defeated into the ground!",
    slots: [
      ["rhyhorn", "gligar", "trapinch"],
      ["gligar", "claydol", "vibrava"],
      ["golurk", "hippowdon", "flygon"],
    ],
  },
  {
    id: "grunt-flying-female-2026-06-25",
    trainerName: "Flying-type Female Grunt",
    trainerClass: "grunt",
    quote: "Battle against my Flying-type Pokemon!",
    slots: [
      ["taillow", "rookidee", "swablu"],
      ["scyther", "zubat", "gligar"],
      ["dragonite", "toucannon", "swanna"],
    ],
  },
  {
    id: "grunt-psychic-male-2026-06-25",
    trainerName: "Psychic-type Male Grunt",
    trainerClass: "grunt",
    quote: "Are you scared of psychics that use unseen power?",
    slots: [
      ["wobbuffet", "ralts", "drowzee"],
      ["drowzee", "duosion", "wobbuffet"],
      ["gallade", "malamar", "reuniclus"],
    ],
  },
  {
    id: "grunt-bug-male-2026-06-25",
    trainerName: "Bug-type Male Grunt",
    trainerClass: "grunt",
    quote: "Go, my super bug Pokemon!",
    slots: [
      ["venonat", "weedle", "grubbin"],
      ["pinsir", "anorith", "dewpider"],
      ["scizor", "scolipede", "vikavolt"],
    ],
  },
  {
    id: "grunt-rock-male-2026-06-25",
    trainerName: "Rock-type Male Grunt",
    trainerClass: "grunt",
    quote: "Let's rock and roll!",
    slots: [
      ["onix", "kabuto", "cranidos"],
      ["shieldon", "graveler", "cranidos"],
      ["tyrantrum", "golem", "aurorus"],
    ],
  },
  {
    id: "grunt-ghost-male-2026-06-25",
    trainerName: "Ghost-type Male Grunt",
    trainerClass: "grunt",
    quote: "Ke...ke...ke...ke...ke...ke!",
    slots: [
      ["duskull", "gastly", "yamask"],
      ["dusclops", "sableye", "cofagrigus"],
      ["gengar", "froslass", "cofagrigus"],
    ],
  },
  {
    id: "grunt-dragon-female-2026-06-25",
    trainerName: "Dragon-type Female Grunt",
    trainerClass: "grunt",
    quote: "ROAR! ...How'd that sound?",
    slots: [
      ["noibat", "deino", "dratini"],
      ["exeggutor_alolan", "dragonair", "gabite"],
      ["dragonite", "garchomp", "salamence"],
    ],
  },
  {
    id: "grunt-dark-female-2026-06-25",
    trainerName: "Dark-type Female Grunt",
    trainerClass: "grunt",
    quote: "Wherever there is light, there is also shadow.",
    slots: [
      ["carvanha", "poochyena", "rattata_alolan"],
      ["sneasel", "houndour", "absol"],
      ["liepard", "hydreigon"],
    ],
  },
  {
    id: "grunt-steel-male-2026-06-25",
    trainerName: "Steel-type Male Grunt",
    trainerClass: "grunt",
    quote: "You're no match for my iron will!",
    slots: [
      ["sandshrew_alolan", "aron", "beldum"],
      ["lairon", "skarmory", "metang"],
      ["aggron", "sandslash_alolan", "probopass"],
    ],
  },
  {
    id: "grunt-fairy-female-2026-06-25",
    trainerName: "Fairy-type Female Grunt",
    trainerClass: "grunt",
    quote: "Check out my cute Pokemon!",
    slots: [
      ["ralts", "snubbull", "vulpix_alolan"],
      ["snubbull", "weezing_galarian", "kirlia"],
      ["ninetales_alolan", "weezing_galarian", "granbull"],
    ],
  },
  {
    id: "grunt-starter-male-2026-06-25",
    trainerName: "Mixed Starter Male Grunt",
    trainerClass: "grunt",
    quote: "Winning is for winners.",
    slots: [
      ["bulbasaur", "charmander", "squirtle"],
      ["ivysaur", "charmeleon", "wartortle"],
      ["venusaur", "charizard", "blastoise"],
    ],
  },
  {
    id: "grunt-winning-female-2026-06-25",
    trainerName: "Winning Female Grunt",
    trainerClass: "grunt",
    quote: "Winning is for winners.",
    slots: [
      ["snorlax", "lapras"],
      ["poliwrath", "gardevoir", "snorlax"],
      ["gyarados", "dragonite", "snorlax"],
    ],
  },
  {
    id: "decoy-female-2026-06-25",
    trainerName: "Decoy Female Grunt",
    trainerClass: "decoy",
    quote: "Fooled ya, twerp.",
    slots: [
      ["bellsprout"],
      ["raticate", "weepinbell"],
      ["raticate", "snorlax"],
    ],
  },
];

async function main() {
  const sourceVersion = await readLeekDuckSourceVersion();
  if (sourceVersion !== expectedLeekDuckVersion) {
    throw new Error(
      `Leek Duck source version changed from "${expectedLeekDuckVersion}" to "${sourceVersion}". Review ${leekDuckUrl} and update the normalized lineup table before regenerating.`,
    );
  }

  const existing = rocketLineupSnapshotSchema.parse(
    JSON.parse(await readFile("public/data/rocket-lineups.json", "utf8")),
  );
  const generatedAt = existing.generatedAt;
  const lineups = [
    ...existing.lineups.filter((lineup) => !isRefreshManaged(lineup)),
    ...gruntLineups.map((lineup) =>
      normalizeLineup(lineup, generatedAt, sourceVersion),
    ),
  ];
  const sourceHash = hashLineups(lineups, sourceVersion);
  if (sourceHash === existing.sourceHash) {
    console.log(
      `Rocket lineups are already current for ${sourceVersion}; no snapshot changes written.`,
    );
    return;
  }

  const refreshedAt = nowIso();
  const refreshedLineups = [
    ...existing.lineups.filter((lineup) => !isRefreshManaged(lineup)),
    ...gruntLineups.map((lineup) =>
      normalizeLineup(lineup, refreshedAt, sourceVersion),
    ),
  ];
  const snapshot: RocketLineupSnapshot = {
    schemaVersion: existing.schemaVersion,
    generatedAt: refreshedAt,
    effectiveDate,
    sourceHash: hashLineups(refreshedLineups, sourceVersion),
    lineups: refreshedLineups,
  };

  rocketLineupSnapshotSchema.parse(snapshot);
  await writeSnapshot("public/data/rocket-lineups.json", snapshot);
  await writeSnapshot("src/data/generated/rocket-lineups.json", snapshot);
  console.log(
    `Wrote ${snapshot.lineups.length} Rocket lineups from ${sourceVersion}.`,
  );
}

async function readLeekDuckSourceVersion() {
  const response = await fetch(leekDuckUrl);
  if (!response.ok) {
    throw new Error(
      `Leek Duck fetch failed: ${response.status} ${response.statusText}`,
    );
  }

  const html = await response.text();
  const match = html.match(
    /Updated on\s*<time[^>]*>([A-Z][a-z]+ \d{1,2}, \d{4})<\/time>/,
  );
  if (!match) {
    throw new Error("Could not find Leek Duck source version in page HTML.");
  }
  return `Updated on ${match[1]}`;
}

function isRefreshManaged(lineup: RocketLineup) {
  return lineup.trainerClass === "grunt" || lineup.trainerClass === "decoy";
}

function normalizeLineup(
  source: SourceLineup,
  retrievedAt: string,
  sourceVersion: string,
): RocketLineup {
  const provenance: DataProvenance = {
    sourceName: "Leek Duck Rocket Lineups",
    sourceUrl: leekDuckUrl,
    retrievedAt,
    sourceVersion,
    parserVersion,
    license:
      "Attribution status not established; factual lineup snapshot with source citation.",
    category: "sourced",
    notes: `${source.trainerName} lists ${source.slots
      .map((slot, index) => `slot ${index + 1}: ${slot.join("/")}`)
      .join("; ")}.`,
  };

  return {
    id: source.id,
    trainerName: source.trainerName,
    trainerClass: source.trainerClass,
    quote: source.quote,
    effectiveDate,
    sourceAgreement: "single-source",
    slots: source.slots.map((pokemonIds, index) => ({
      slot: index + 1,
      pokemonIds,
    })),
    provenance: [provenance],
    notes:
      "Imported from the current Leek Duck lineup table. Needs independent source reconciliation before being treated as verified agreement.",
  };
}

function hashLineups(lineups: RocketLineup[], sourceVersion: string) {
  const stableLineups = lineups.map((lineup) => ({
    ...lineup,
    provenance: lineup.provenance.map((provenance) => {
      const { retrievedAt, ...rest } = provenance;
      void retrievedAt;
      return rest;
    }),
  }));

  return createHash("sha256")
    .update(JSON.stringify({ lineups: stableLineups, sourceVersion }))
    .digest("hex");
}

async function writeSnapshot(path: string, snapshot: RocketLineupSnapshot) {
  await writeFile(path, `${JSON.stringify(snapshot, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
