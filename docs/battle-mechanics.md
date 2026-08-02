# Battle Mechanics

Rocket Pair Lab implements source-backed Trainer Battle mechanics where public
references are specific enough, and keeps unresolved behavior marked as
experimental or configurable.

Known calculations:

- CP and effective stats at level 40, 15/15/15.
- Raw bulk proxy as effective defense times effective HP.
- STAB and type effectiveness.
- Fast-move STAB-adjusted DPT, EPT, duration, and seconds.
- Charged-move STAB-adjusted damage per energy.
- Discrete fast-move counts to charged attacks with leftover energy.
- STAB-adjusted neutral move power per 100 fast-move turns, which combines
  fast-move power plus the charged-move power funded by generated energy after
  applying same-type attack bonus. This is a derived comparison metric, not
  matchup-specific damage or wall-clock battle output.
- Cumulative 100-turn output charts use fast-move turns on the x-axis. Charged
  attacks are shown as turn-model events, not as wall-clock animation spans.
- Trainer Battle damage uses the 30% damage boost documented for Trainer
  Battles.
- The experimental Rocket proxy simulator uses type effectiveness, STAB, known
  Rocket opponent moves when available, shield counts, and current opponent HP
  when deciding whether to throw a charged move.
- The charged-move selector avoids spending energy when the next fast move can
  knock out an unshielded opponent, uses cheaper charged moves to break Rocket
  shields, chooses low-energy knockout moves when several are available, and
  lets non-ASAP strategies wait for a stronger charged move when the current
  available move is not the best pressure option.
- Rocket opponent Attack, Defense, Stamina, HP, and CP use the Pokebattler 2021
  Rocket CP formula, including Rocket attack IV, Defense IV 15, Stamina IV 9,
  trainer-level rCPM values, and Grunt/Leader/Giovanni rank multipliers.
- NPC Pokemon are modeled as sent in order and never switched until fainting.
- Team GO Rocket Grunts use zero shields. Leaders and Giovanni use two shields
  against the player's first two Charged Attacks.
- NPC pause windows after Charged Attacks and switch-ins are modeled as 2
  seconds, or 4 turns.
- Rocket move pools come from normalized PvPoke data. The simulator uses the
  first available fast move and first available charged move as a deterministic
  branch for the source-documented random NPC move assignment.

Unresolved Rocket mechanics remain configurable or unverified:

- Exact random Rocket move assignment probabilities.
- Rocket charged move energy timing/cadence.
- Buffs and debuffs during battle.
- Fast-attack cancellation and charged-attack priority edge cases.
- Wall-clock animation timings.
- Real-battle validation of the resulting win/loss outputs.

References:

- Bulbapedia Trainer Battle (GO): NPC order, shield behavior, pauses, and
  Trainer Battle damage rules.
- Bulbapedia Team GO Rocket / Grunt pages: Team GO Rocket shield behavior and
  same-order Grunt send-ins.
- Pokebattler, "Cracking the Rocket CP Formula - 2021 edition": Rocket stat,
  rCPM, and rank multiplier formulas.
