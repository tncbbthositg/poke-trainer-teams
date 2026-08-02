import {
  type PokemonFocusStrategy,
} from "../../domain/ranking/pokemonFocus";
import type { BattleStrategy } from "../../domain/battle/types";

export function battleStrategyForFocus(
  strategy: PokemonFocusStrategy,
): BattleStrategy {
  if (strategy === "charged-pause-control" || strategy === "practical-spam") {
    return "charge-asap";
  }

  return "fastest-expected-knockout";
}
