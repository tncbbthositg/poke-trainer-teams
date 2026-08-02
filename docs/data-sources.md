# Data Sources

## PvPoke

PvPoke GameMaster is the primary normalized source for Trainer Battle species,
stats, legal moves, move damage, energy, duration, and buff/debuff metadata.
PvPoke rankings are not imported as Rocket rankings.

PvPoke Moves is a human-readable cross-check for move table labels and metrics.
The deployed app does not scrape it.

Candidate discovery keeps a hand-picked seed list, then adds the top
high-energy species/forms from Rocket Pair Lab's local focus-strategy scoring.
Discovered species/forms must be non-shadow, non-mega, non-primal, have at
least one fast move with EPT >= 4, at least two charged moves, and at least one
charged move costing 45 energy or less. This selects a reviewable candidate set
from PvPoke source data; it does not import PvPoke rankings.

## Rocket Lineups

Leek Duck is the primary practical lineup snapshot source for Milestone 1.
Pokemon GO Hub is the planned independent cross-check. Niantic Help pages
support general Rocket terminology but not full lineups or formulas.

When sources disagree, records must be marked disputed or unverified.

`yarn data:update:rocket` fetches Leek Duck to verify the current page version,
then regenerates the normalized lineup snapshot from a manually reviewed table
in `scripts/data/fetch-rocket-lineups.ts`. A weekly GitHub Actions workflow runs
the same command so source-version changes are caught promptly.
