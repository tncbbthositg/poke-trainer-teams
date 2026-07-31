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

- PvPoke GameMaster: primary normalized source for Trainer Battle Pokemon,
  legal moves, stats, and move data. PvPoke is MIT licensed.
- PvPoke Moves: human-readable move table reference.
- Leek Duck Rocket Lineups: practical Rocket lineup snapshot source.
- Pokemon GO Hub Rocket Guide: planned independent lineup cross-check.
- Niantic Help Center: general Rocket terminology and behavior.

This project is not affiliated with Niantic, The Pokemon Company, PvPoke, Leek
Duck, Pokemon GO Hub, or PokeMiners.

## Current Limitations

- Rocket simulator and universal pair rankings are not implemented in Milestone
  1.
- Rocket lineups are a manually reviewable scaffold and need source
  reconciliation before ranking.
- Rocket scaling, pauses, shield AI, and wall-clock timings are unresolved.
- The candidate pool is curated for practical Rocket options, not complete
  Pokedex coverage.
- Morpeko uses PvPoke's Full Belly form in the candidate snapshot.

## Adding A Pokemon

Add the species source id to `scripts/data/fetch-pvpoke.ts`, then run:

```sh
yarn data:update:pvpoke
yarn data:validate
```

Review `public/data/pvpoke-update-summary.md` before committing snapshot
changes.

## Updating Rocket Lineups

Edit `public/data/rocket-lineups.json` with source citations, effective date,
and source agreement status. Mark disagreements as `disputed` or `unverified`.
Run `yarn data:validate`.

## Adding Mechanics Assumptions

Add versioned values to `public/data/mechanics.json` with category, default,
unit, and note. Do not present assumptions as sourced facts.

## GitHub Pages

The Pages workflow builds `dist` after linting, type checking, tests, data
validation, and production build. Vite uses `/poke_trainer_teams/` as the
GitHub Actions base path.

The app uses hash routes such as `#/pokemon` and `#/methodology` so shared links
and browser refreshes work on GitHub Pages without server rewrite support.
