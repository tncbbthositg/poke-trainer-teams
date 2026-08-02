# Rocket Pair Lab

Rocket Pair Lab is an unofficial, static web application for exploring fixed
two-Pokemon teams for Team GO Rocket battles. The long-term goal is to find
ordered pairs that can blind-pick every supported Rocket lineup while minimizing
real-world completion time.

Milestone 1 is a trustworthy data explorer. It does not claim a definitive best
pair.

## Why This Differs From Raid And PvP Rankings

Rocket battles use Trainer Battle move data, Rocket-specific opponent behavior,
shields, pauses, and lineups. PvP and Raid rankings answer different questions.
Rocket Pair Lab uses sourced PvPoke battle data as inputs, then derives
Rocket-specific calculations locally.

## Why Two Pokemon

The target player reserves party slot three for a Buddy Pokemon. Calculations
therefore treat the third battle slot as unavailable.

## Stack

- React, TypeScript strict mode, Vite
- Tailwind CSS, shadcn/ui conventions, Radix primitives
- Lucide icons
- Zod validation
- TanStack Table
- Recharts
- Vitest, React Testing Library, Playwright
- ESLint and Prettier
- Yarn Classic

## Local Setup

```sh
yarn install
yarn dev
```

## Verification

```sh
yarn lint
yarn typecheck
yarn test
yarn data:validate
yarn build
```

## Data Commands

```sh
yarn data:update:pvpoke
yarn data:update:pokeminers
yarn data:sync
yarn data:validate
yarn data:diff
```

The repository keeps checked-in snapshots in `public/data` and byte-identical
bundled snapshots in `src/data/generated`. Run `yarn data:sync` after manual
snapshot edits. The app does not scrape third-party sites at runtime.

## Data Sources And Attribution

- [PvPoke GameMaster](https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json):
  primary normalized source for Trainer Battle Pokemon, legal moves, stats, and
  move data. PvPoke is MIT licensed; Rocket Pair Lab preserves attribution and
  does not import PvPoke rankings as Rocket rankings.
- [PvPoke Moves](https://pvpoke.com/moves/): human-readable reference for
  Trainer Battle move labels and metrics. It is used for manual UI
  cross-checking and is not scraped by the deployed app.
- [Leek Duck Rocket Lineups](https://leekduck.com/rocket-lineups/): primary
  practical Rocket lineup snapshot source for the checked-in Milestone 1
  lineups. Attribution status is not established; records are manually
  normalized factual lineup snapshots. `yarn data:update:rocket` checks the
  Leek Duck source version before regenerating the snapshot.
- [Pokemon GO Hub Rocket Guide](https://pokemongohub.net/post/guide/team-go-rocket-battle-guide/):
  secondary manual lineup cross-check source. Disagreements are marked disputed
  or unverified instead of silently resolved.
- Niantic Help Center: general Team GO Rocket terminology and game-flow
  reference. It is not treated as a complete lineup, formula, or battle
  mechanics source.
- [Bulbapedia Trainer Battle (GO)](https://bulbapedia.bulbagarden.net/wiki/Trainer_Battle_%28GO%29)
  and Team GO Rocket pages: public references for Trainer Battle damage rules,
  NPC send order, Protect Shield behavior, and pause windows.
- [Pokebattler Rocket CP Formula research](https://articles.pokebattler.com/2021/06/21/cracking-the-rocket-cp-formula-2021-edition/):
  public research source for Team GO Rocket stat scaling, rCPM values, and
  Grunt/Leader/Giovanni rank multipliers.
- PokeMiners: planned lower-level Game Master verification source. The
  verification adapter is scaffolded, but PokeMiners data is not a runtime
  browser dependency.

This project is not affiliated with Niantic, The Pokemon Company, PvPoke, Leek
Duck, Pokemon GO Hub, or PokeMiners.

## Current Limitations

- Verified Rocket simulation and universal pair rankings are not implemented;
  Pair Builder currently exposes an experimental proxy simulator only.
- Rocket lineups are a manually reviewable scaffold and need source
  reconciliation before ranking. Current Grunt archetypes are imported from
  Leek Duck as single-source records unless independently cross-checked.
- Rocket opponent stats, shield counts, ordered send-ins, and NPC pause windows
  are source-backed. Random move assignment, charged move timing, buffs/debuffs,
  wall-clock timings, and real-battle win/loss validation remain unresolved.
- The candidate pool is curated for practical Rocket options, not complete
  Pokedex coverage.
- Morpeko uses PvPoke's Full Belly form in the candidate snapshot and is marked
  Rocket-unreliable after a 2026-08-01 field report.

## Adding A Pokemon

Add the species source id to `scripts/data/fetch-pvpoke.ts`, then run:

```sh
yarn data:update:pvpoke
yarn data:validate
```

Review `public/data/pvpoke-update-summary.md` before committing snapshot
changes.

## Updating Rocket Lineups

Run `yarn data:update:rocket` to refresh the normalized Leek Duck snapshot. If
Leek Duck has changed its page version, the script fails and the hardcoded
normalization table in `scripts/data/fetch-rocket-lineups.ts` must be reviewed
before regenerating. Mark disagreements as `disputed` or `unverified`, then run
`yarn data:sync` and `yarn data:validate`.

## Adding Mechanics Assumptions

Add versioned values to `public/data/mechanics.json` with category, default,
unit, and note. Do not present assumptions as sourced facts.

## GitHub Pages

The Pages workflow builds `dist` after linting, type checking, tests, data
validation, and production build. Vite uses `/poke-trainer-teams/` as the
GitHub Actions base path.

The app uses hash routes such as `#/pokemon` and `#/methodology` so shared links
and browser refreshes work on GitHub Pages without server rewrite support.
