# Rocket Pair Lab Plans

Rocket Pair Lab is a static React application for exploring whether a fixed,
ordered two-Pokemon party can clear supported Team GO Rocket lineups without
using party slot three. Milestone 1 is an honest data explorer and calculation
foundation, not a finished Rocket ranking engine.

## Current Repository State

- Greenfield repository on `main`.
- No package manager, framework, or source files are present yet.
- No remote is configured.
- Use Yarn Classic.

## Source Status

Verified source entry points as of 2026-07-31:

- PvPoke normalized GameMaster:
  `https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json`
  was reachable and reported timestamp `2026-07-30 21:39:36`.
- PvPoke Moves page:
  `https://pvpoke.com/moves/` was reachable and provides a human-readable
  Trainer Battle moves table with fast/charged move filtering and displayed
  metrics such as damage, energy, turns, DPT, and EPT. Use it as a UX and
  verification reference; keep automated imports based on versioned source data.
- Leek Duck Rocket lineups:
  `https://leekduck.com/rocket-lineups/` was reachable and displayed current
  Leader, Giovanni, and Grunt lineups.
- Pokemon GO Hub Rocket guide:
  `https://pokemongohub.net/post/guide/team-go-rocket-battle-guide/` was
  reachable and identified itself as a July 2026 Rocket guide.
- Niantic Help Center Rocket Grunts and Leaders/Giovanni pages were reachable
  and support general terminology and game flow, but not complete lineup data or
  battle formulas.
- PokeMiners latest raw Game Master URL is identified, but Milestone 1 should
  treat it as an optional verification adapter until the parser is implemented.

## Data Classification

### Verified Game Data

Stored as normalized snapshots with source registry metadata:

- Pokemon species identifiers, names, types, base stats, tags, and legal Trainer
  Battle moves from PvPoke.
- Trainer Battle fast-move fields: type, power, energy delta, duration, and
  buff/debuff metadata from PvPoke.
- Trainer Battle charged-move fields: type, power, energy cost, and buff/debuff
  metadata from PvPoke.
- PvPoke Moves page labels and public metrics as a manual cross-check for move
  analytics display.
- Manually reviewed Rocket lineup snapshot from Leek Duck, cross-checked against
  Pokemon GO Hub where available.
- Niantic-supported general Rocket terminology: Grunts, Leaders, Giovanni,
  Rocket Radar, Super Rocket Radar, decoy Grunts, Shadow Pokemon encounter flow.

### Derived Values

Computed locally by pure TypeScript functions:

- CP and effective stats for level 40, 15/15/15 attackers.
- Raw bulk proxy: effective defense times effective HP.
- Type weaknesses, resistances, STAB applicability, and type effectiveness.
- DPT, EPT, DPS where meaningful, damage per energy, discrete turns to charge,
  leftover energy, and repeat charged-attack intervals.
- Move-combination coverage and estimated interaction complexity labels.
- Snapshot content hashes.

### Configurable Assumptions

Versioned in `MechanicsConfig` or `TimingConfig`, shown in Methodology, and not
presented as verified facts:

- Trainer Level demo default, initially `50`, because Rocket scaling may depend
  on it.
- Rocket stat scaling formulas and rank multipliers.
- Rocket pauses after charged attacks, switches, and Pokemon entry.
- Charged Attack minigame and animation wall-clock durations.
- Switch, faint, and opponent-entry wall-clock durations.
- Player reaction delay.
- Healing and revive menu time.
- Shield policy defaults for Leaders and Giovanni.

### Unresolved Mechanics

These cannot yet be supported by the listed reliable sources alone:

- Exact current Rocket opponent stats and trainer-level scaling.
- Exact Rocket fast and charged move selection for every lineup member.
- Exact Rocket post-action pause windows and whether they vary by context.
- Exact Leader and Giovanni shield AI beyond the common expectation that they
  shield early charged attacks.
- Exact wall-clock animation timings across devices and network conditions.
- Whether all Leek Duck and Pokemon GO Hub lineup entries agree for every
  current Grunt, Leader, Giovanni, and decoy slot.
- Whether every July 2026 lineup remains current after 2026-07-31.

### Experimental Values

- Any pair ranking, matchup result, battle timeline, or universal-pass status
  remains experimental until the deterministic Rocket simulator is implemented
  and validated against recorded battles.

## Proposed Architecture

```text
public/
  data/
    metadata.json
    pokemon.json
    moves.json
    rocket-lineups.json
    mechanics.json
scripts/
  data/
    fetch-pvpoke.ts
    fetch-pokeminers.ts
    normalize-pokemon.ts
    normalize-moves.ts
    validate-snapshots.ts
    diff-snapshots.ts
src/
  app/
  components/
    charts/
    tables/
    ui/
  data/
    generated/
    schemas/
    sources/
  domain/
    battle/
    moves/
    pokemon/
    ranking/
    rocket/
    stats/
    strategies/
    types/
  features/
    overview/
    pokemon-explorer/
    moveset-comparator/
    pair-builder/
    lineup-matrix/
    battle-timeline/
    methodology/
    settings/
  lib/
  test/
docs/
  architecture.md
  battle-mechanics.md
  data-sources.md
  validation-plan.md
.github/
  workflows/
```

## Major Data Types

- `DataProvenance`: source name, URL, retrieval timestamp, source version or
  hash, parser version, license, attribution, and value category.
- `PokemonSpecies`: normalized species identity, form, types, base stats, tags,
  legal fast moves, legal charged moves, and provenance.
- `PokemonBuild`: species, level, IVs, shadow flag, best-buddy flag, selected
  fast move, selected charged moves, and assumption metadata.
- `EffectiveStats`: CP, effective attack, defense, HP, and bulk proxy.
- `FastMove` and `ChargedMove`: Trainer Battle move fields only.
- `MoveSetAnalytics`: discrete charge timings, damage and energy efficiency,
  coverage, and decision complexity.
- `RocketTrainer`, `RocketLineup`, and `RocketPokemonSlot`: manually reviewed
  lineup snapshot records with source agreement status.
- `MechanicsConfig` and `TimingConfig`: versioned assumptions with confidence
  labels and notes.
- `BattleState`, `BattleEvent`, `BattleResult`: deterministic engine interfaces.
- `PairEvaluation`: ordered pair, movesets, strategy, lineup result, assumptions,
  and simulation version.

## Calculation Boundaries

- Domain calculations live under `src/domain/**` and must not import React.
- React components consume typed view models and call pure domain functions.
- Data loading validates external snapshots with Zod before use.
- Runtime browser code reads checked-in snapshots only; it does not scrape or
  fetch third-party sources.
- Data update scripts may use the network during development and must write a
  diff summary before replacing snapshots.
- Battle simulation uses event records for turns, combat duration, and
  wall-clock duration separately.

## Milestones

### Milestone 1: Trustworthy Interactive Data Explorer

1. Scaffold Vite, React, TypeScript strict mode, Tailwind CSS, shadcn/ui, Radix,
   Lucide, Zod, Recharts, TanStack Table, Vitest, React Testing Library,
   Playwright smoke tests, ESLint, and Prettier with Yarn Classic.
2. Add source registry, provenance types, and Zod schemas.
3. Add PvPoke fetch and normalization scripts for the ten initial candidates.
4. Add checked-in `public/data` snapshots for candidates, moves, Rocket
   lineups, mechanics assumptions, and source metadata.
5. Implement level-40 15/15/15 stat, CP, type, STAB, bulk, and move analytics,
   using PvPoke Moves as the display reference for fast/charged move controls.
6. Implement responsive app shell, light/dark themes, and compact navigation.
7. Build Overview, Pokemon Explorer, Moveset Comparator, Pair Builder scaffold,
   Lineup Matrix scaffold, and Methodology views.
8. Add battle engine interfaces and boundary tests without claiming universal
   rankings.
9. Add docs, README, CI, and GitHub Pages deployment workflow.
10. Verify `yarn install --frozen-lockfile`, lint, typecheck, tests, and build.

### Milestone 2: Deterministic Rocket Simulator

- Add opponent stats and scaling, Rocket shield behavior, Rocket pauses,
  strategy policies, pair simulations, battle timeline, and universal pass/fail
  evaluation. Mark simulator output Experimental.

### Milestone 3: Empirical Validation

- Add a workflow for recorded battle observations and calibrate uncertain timing
  or mechanics values against real battles.

### Milestone 4: Complete Ranking Engine

- Expand beyond the initial ten candidates and compute ordered pair and moveset
  rankings across supported lineups with sensitivity analysis.

## Risks

- Current Rocket lineups change frequently and may be disputed between sources.
- Rocket-specific formulas may be community-derived rather than official.
- Wall-clock timings vary by device, animation state, network conditions, and
  player behavior.
- The legal move pool must stay strictly separated from PvE move stats.
- Full pair and moveset evaluation can become expensive; workers and stable
  input hashing may be needed.
- GitHub Pages base-path configuration depends on the final repository name and
  deployment URL.

## Milestone 1 Definition of Done

- All ten initial Pokemon load from sourced, validated snapshots.
- Legal Trainer Battle movesets can be compared interactively.
- Level-40 calculations and move analytics are covered by tests.
- Current Rocket lineups are represented with provenance and disagreement flags.
- Every page displays source and confidence information.
- No unsupported value is presented as verified.
- No definitive best-pair claim is made.
- `yarn install --frozen-lockfile`, `yarn lint`, `yarn typecheck`,
  `yarn test`, and `yarn build` pass.
- The app runs locally and has a GitHub Pages deployment workflow.
