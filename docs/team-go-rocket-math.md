# Team GO Rocket Math

This specification records the Team GO Rocket stat and Trainer Battle damage
arithmetic used by Rocket Pair Lab as of August 2026. Battle timing, pauses,
switching, energy scheduling, shields, and move selection remain separate from
these formulas.

## Player Pokemon Stats

Player Pokemon use the normal Pokemon-level CPM from `src/domain/stats`.
Rocket CPM is never used for player Pokemon.

```ts
attack = (baseAttack + attackIV) * pokemonCPM
defense = (baseDefense + defenseIV) * pokemonCPM
stamina = (baseStamina + staminaIV) * pokemonCPM
maxHp = Math.max(10, Math.floor(stamina))
cp = Math.max(10, Math.floor((attack * Math.sqrt(defense) * Math.sqrt(stamina)) / 10))
```

## Rocket Pokemon Stats

Rocket rank multipliers are `1.00` for Grunts and decoys, `1.05` for Leaders,
and `1.15` for Giovanni.

Rocket synthetic IVs:

```ts
attackIV = Math.floor((2 * baseAttack) / 3 + 25)
defenseIV = 15
staminaIV = 15
```

Rocket CPM values are stored as decimal configuration values for Trainer Levels
8 through 80. The selected value is converted with `Math.fround()` before stat
calculation because the game interprets these values as single-precision
floats.

```ts
rocketAttack = (baseAttack + attackIV) * rocketCPM * rankMultiplier
rocketDefense = (baseDefense + 15) * rocketCPM * rankMultiplier
rocketStamina = Math.floor(0.6 * (baseStamina + 15)) * rocketCPM * rankMultiplier
rocketMaxHp = Math.floor(rocketStamina)
rocketCp = Math.floor((rocketAttack * Math.sqrt(rocketDefense) * Math.sqrt(rocketStamina)) / 10)
```

Displayed Rocket CP is not used to derive battle stats.

## Trainer Battle Damage

Rocket battles use PvP/Trainer Battle move values from the project Game Master
data: PvP power, energy delta, duration in turns, attack and defense stage
changes, and effect chances.

```ts
damage =
  Math.floor(
    0.5 *
      movePower *
      effectiveAttack / effectiveDefense *
      1.3 *
      stab *
      typeEffectiveness *
      chargedAttackQuality *
      otherApplicableModifiers
  ) + 1
```

Required multipliers:

- Trainer Battle damage multiplier: `1.3`.
- STAB: `1.2`, otherwise `1`.
- Type effectiveness: `1.6`, `2.56`, `0.625`, or `0.390625` as applicable.
- Shadow attacker: multiply Attack by `1.2`.
- Shadow defender: multiply Defense by `5 / 6`.

Rocket Pokemon count as Shadow Pokemon for incoming and outgoing damage. Shadow
modifiers do not affect displayed CP. A Shadow player Pokemon attacking a Rocket
Pokemon receives both Shadow effects before final flooring.

Shielded Charged Attacks deal `1` damage.

## Stat Stages

Attack and defense stages are applied before damage calculation.

```ts
function stageMultiplier(stage: number): number {
  const value = Math.max(-4, Math.min(4, stage))

  return value >= 0 ? (4 + value) / 4 : 4 / (4 - value)
}
```

## Charged Attack Quality

Fully charged player Charged Attacks use `1.0`. Rocket AI Charged Attack
quality is configurable in mechanics data because historical estimates around
`0.5625` have not been sufficiently revalidated after the 2026 battle-engine
rewrite.

## Sources

- March 2023 Rocket stat research:
  <https://www.reddit.com/r/TheSilphRoad/comments/122pfk8/current_team_rocket_cp_formula_march_2023/>
- Current level 8 through 80 Rocket CPM research:
  <https://www.reddit.com/r/TheSilphRoad/comments/1puc05x/cpmr_list_for_level_80_update_and_more_indepth/>
- Confirmation of the 1.3 Trainer Battle damage multiplier:
  <https://www.reddit.com/r/TheSilphRoad/comments/13puajs/questions_regarding_team_rocket_cp_formula_and/>
- Current Game Master data:
  <https://github.com/PokeMiners/game_masters>
