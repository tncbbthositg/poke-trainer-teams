# Validation Plan

Milestone 1 validates source structure and formulas with unit tests.

Milestone 2 validates deterministic engine behavior for shields, energy caps,
faints, switches, ordered pair behavior, no third-slot usage, Rocket
fast-move energy, Rocket charged-move spending, and universal proxy
pass/fail aggregation.

Milestone 3 compares simulator output with recorded real battles. Observations
belong in `public/data/battle-observations.json`; `yarn data:sync` mirrors the
snapshot into `src/data/generated`, and `yarn data:validate` checks that
lineup, Pokemon, fast move, and charged move ids still resolve.

Each observation records:

- Actual battle time.
- Attacker level, IVs, moves, and status.
- Opponent lineup and observed moves.
- Shields, faints, HP remaining, and switches.
- Device, lag, and animation notes.

Validation work should compare each observation against the simulator using the
same ordered pair, lineup, moves, trainer level, and strategy. Differences in
win/loss, shield counts, faints, HP remaining, charged-attack timing, or battle
seconds should either calibrate a versioned mechanic or remain documented as an
unresolved limitation.

No universal-pair ranking should be treated as reliable until this validation
loop exists.
