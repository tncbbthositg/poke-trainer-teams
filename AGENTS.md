# Repository Conventions for Agents

This repository is a greenfield static web app for Rocket Pair Lab. Keep changes
small, typed, source-grounded, and reviewable.

## Commands

Use Yarn Classic unless the repository later establishes another package
manager.

Expected commands after Milestone 1 setup:

- `yarn install --frozen-lockfile`: clean install for CI.
- `yarn install`: install dependencies and create/update `yarn.lock`.
- `yarn dev`: start the Vite dev server.
- `yarn lint`: run ESLint.
- `yarn format`: run Prettier.
- `yarn typecheck`: run TypeScript without emitting.
- `yarn test`: run Vitest.
- `yarn test:ui`: run React Testing Library-oriented tests through Vitest.
- `yarn test:e2e`: run Playwright smoke tests when configured.
- `yarn build`: create the static production build.
- `yarn data:update:pvpoke`: fetch and normalize PvPoke snapshots.
- `yarn data:update:pokeminers`: fetch PokeMiners data for verification.
- `yarn data:sync`: mirror `public/data/*.json` into `src/data/generated`.
- `yarn data:validate`: validate checked-in data snapshots.
- `yarn data:diff`: summarize snapshot changes.

## Architecture Boundaries

- `src/domain/**` contains pure TypeScript game logic and must not import React.
- `src/data/schemas/**` contains Zod schemas for external and normalized data.
- `src/data/sources/**` contains source registry and provenance definitions.
- `src/features/**` contains feature-level React views and state wiring.
- `src/components/ui/**` contains shadcn/ui components.
- `src/components/tables/**` and `src/components/charts/**` contain reusable
  data display components.
- `public/data/**` contains checked-in normalized snapshots consumed by the
  deployed static app.
- `scripts/data/**` contains developer-run ingestion, normalization,
  validation, and diff tools.
- `.github/workflows/**` contains CI and GitHub Pages deployment workflows.

Do not put formulas, battle rules, source parsing, or ranking logic directly in
React components.

## Data Provenance Rules

- Every imported snapshot must include source name, source URL, retrieval
  timestamp, source commit/timestamp/hash when available, parser version,
  license or attribution status, and value category.
- Important values must be classified as one of `sourced`, `derived`,
  `configurable-assumption`, `unverified`, or `experimental`.
- PvPoke is the primary normalized source for Trainer Battle stats and legal
  moves. Preserve MIT attribution.
- PvPoke Moves (`https://pvpoke.com/moves/`) may be used as a human-readable
  cross-check and UI reference for fast/charged move filtering and metrics such
  as damage, energy, turns, DPT, and EPT. Do not scrape it at browser runtime.
- PokeMiners is a lower-level verification source, not a runtime browser
  dependency.
- Rocket lineups are checked-in snapshots, manually reviewable, and sourced.
- When Leek Duck and Pokemon GO Hub disagree, mark the lineup disputed or
  unverified. Do not silently choose one.
- The deployed app must not scrape or fetch third-party sources at runtime.
- `public/data` and `src/data/generated` must remain byte-identical for JSON
  snapshots. Run `yarn data:sync` after manually editing `public/data`.
- Never import PvPoke rankings as Rocket rankings.
- Do not mix Raid/Gym move stats with Trainer Battle move stats.
- Do not use copyrighted Pokemon artwork or hotlink third-party images unless
  license and usage rights are understood.

## Mechanics Rules

- Unknown Rocket mechanics stay unknown or configurable.
- Configurable timing and scaling values belong in versioned `MechanicsConfig`
  or `TimingConfig` data, with labels, defaults, source status, and notes.
- Ranking, battle results, and universal-pair claims are Experimental until the
  deterministic simulator is implemented and validated.
- The third party slot is unavailable for calculations.
- Trainer Level must be visible in the simulation UI; a default of 50 is only a
  demo assumption.

## Testing Requirements

Before trusting rankings, cover:

- Effective stats and CP at a known level and IV spread.
- DPT, EPT, STAB, type effectiveness, and bulk proxy.
- Discrete time-to-charge, leftover energy, and repeat intervals.
- Energy cap and charged-move energy consumption.
- Buff/debuff stage limits and shield behavior once implemented.
- Fainting, switching, deterministic results, and ordered-pair differences.
- Candidate species resolution, legal moves, Rocket lineup species resolution,
  source metadata, stable hashes, and duplicate lineup rejection.
- UI behavior for filters, moveset comparisons, pair selection, visible source
  dates, visible experimental assumptions, and textual failure indicators.

## Implementation Standards

- TypeScript strict mode stays enabled.
- Do not use `any` to bypass data-model problems.
- Do not swallow validation errors.
- Prefer pure functions and explicit inputs over hidden globals.
- Keep constants named, typed, versioned when appropriate, and source-labeled.
- Keep UI mobile-first, dense, accessible, high-contrast, and data-first.
- Avoid marketing pages, fake recommendations, decorative charts, copyrighted
  art, unsupported rankings, and unverified mechanics presented as facts.
- Use hash-compatible navigation or avoid route-dependent navigation for GitHub
  Pages.

## Definition of Done

A change is done when:

- Relevant docs and source provenance are updated.
- Relevant unit, data, UI, or smoke tests are added or updated.
- `yarn lint`, `yarn typecheck`, `yarn test`, and `yarn build` pass
  unless the final response explicitly documents why a command could not run.
- New data snapshots validate and include a readable diff summary.
- The Methodology UI can explain any new formula, source, assumption, or
  limitation.
- No unsupported value is presented as verified.
