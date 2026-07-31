# Battle Mechanics

Milestone 1 implements formula and move analytics only.

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

Unresolved Rocket mechanics remain configurable or unverified:

- Rocket stat scaling and rank multipliers.
- Rocket move selection.
- Rocket shield behavior.
- Rocket pauses after switches, charged attacks, and Pokemon entry.
- Wall-clock animation timings.
