# Architecture

Rocket Pair Lab is a static Vite application. The repository keeps deployable
snapshots in `public/data`; the bundled app imports mirrored snapshots from
`src/data/generated` through Zod validation.

## Boundaries

- `src/domain/**`: pure TypeScript formulas, move analytics, type logic, and
  battle interfaces. No React imports.
- `src/data/schemas/**`: Zod schemas for normalized snapshots.
- `src/features/**`: application views and user interaction.
- `scripts/data/**`: developer-run ingestion, validation, and diff scripts.
- `public/data/**`: reduced snapshots suitable for GitHub Pages.
- `src/data/generated/**`: mirrored snapshots imported by the Vite bundle.
  `yarn data:validate` fails if these JSON files drift from `public/data`.

Milestone 1 intentionally stops before Rocket battle simulation. The battle
engine exposes typed event/result boundaries so Milestone 2 can add deterministic
simulation without rewriting the UI.
