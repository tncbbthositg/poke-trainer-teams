import { Badge } from "../../components/atoms/Badge";
import { Panel, PanelHeader } from "../../components/molecules/Panel";
import type { ApplicationData } from "../../data/loaders";

export function Methodology({ data }: { data: ApplicationData }) {
  return (
    <div className="grid gap-4">
      <Panel>
        <PanelHeader
          title="Methodology and Sources"
          subtitle="Unofficial project. Not affiliated with Niantic, The Pokemon Company, PvPoke, Leek Duck, Pokemon GO Hub, or PokeMiners."
        />
        <div className="grid gap-3 p-3">
          {data.metadata.sources.map((source) => (
            <div
              key={`${source.sourceName}-${source.sourceUrl}`}
              className="rounded border border-[rgb(var(--border))] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">{source.sourceName}</h3>
                <Badge tone={source.category === "sourced" ? "ok" : "warning"}>
                  {source.category}
                </Badge>
              </div>
              <a
                className="mt-1 block break-all text-xs text-[rgb(var(--primary))]"
                href={source.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                {source.sourceUrl}
              </a>
              <p className="mt-2 text-xs text-[rgb(var(--muted-foreground))]">
                Retrieved: {source.retrievedAt}. Version: {source.sourceVersion}
                . Parser: {source.parserVersion}. License: {source.license}.
              </p>
              <p className="mt-2 text-sm">{source.notes}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel>
        <PanelHeader title="Formulas and Boundaries" />
        <div className="grid gap-3 p-3 text-sm text-[rgb(var(--muted-foreground))]">
          <p>
            Effective stats use Pokemon GO CP multipliers for the selected level
            and IVs. Milestone 1 exposes level 40, 15/15/15 attacker
            calculations.
          </p>
          <p>
            Raw bulk proxy is effective defense times effective HP. It is not
            matchup-specific survivability.
          </p>
          <p>
            Time to Charged Attack uses discrete fast-move energy: ceil(energy
            cost / fast energy gain) times fast-move turns. Leftover energy is
            preserved for repeat timing displays.
          </p>
          <p>
            Candidate discovery keeps a hand-picked seed list, then adds top
            high-energy species/forms from each focus strategy. Discovered
            candidates must be non-shadow, non-mega, non-primal, have a fast
            move at 4+ EPT, have at least two charged moves, and have at least
            one charged move costing 45 energy or less.
          </p>
          <p>
            Focus rankings are experimental. Charged pause control and
            practical spam sort by boss proxy clear coverage first, using the
            checked-in Giovanni, Arlo, Cliff, and Sierra lineups. Their
            tie-breaker heuristic emphasizes first and repeat charged-attack
            timing, fast-move cadence for Rocket pause control, cheap
            charged-move count, and bulk reliability more than raw fast-move
            damage. Ties prefer candidates with more 4/4 boss pair options
            before falling back to total pair clears, clear time, and focus
            score. Practical spam also downweights legendary, mythical, Ultra
            Beast, and high-value raid attacker overlap while slightly
            upweighting starter candidates to reflect candy competition and
            build accessibility.
          </p>
          <p>
            Pair Builder uses an experimental Rocket estimate. Rocket stats,
            shields, pauses, move damage, and charged-move energy timing use
            source-labeled mechanics where available, with explicit fallbacks
            when source data is missing.
          </p>
          <p>
            Player Charged Attack choice is matchup-aware: after obvious fast
            move knockouts, it weighs current opponent HP, type-effective
            damage, damage per energy, remaining Rocket shields, and guaranteed
            buff or debuff stage value. Chance-based stage effects remain
            documented but are not simulated.
          </p>
          <p>
            Universal proxy clear/fail checks run one ordered pair across every
            checked-in Rocket lineup. They are useful failure indicators, not
            verified rankings.
          </p>
          <p>
            Battle Timeline exposes simulator events so charged attacks,
            shields, faints, switches, HP, energy, and assumptions can be
            inspected before any result is trusted.
          </p>
        </div>
      </Panel>
      <Panel>
        <PanelHeader title="Assumptions and Unknowns" />
        <div className="grid gap-2 p-3 sm:grid-cols-2">
          {data.mechanics.values.map((value) => (
            <div
              key={value.key}
              className="rounded border border-[rgb(var(--border))] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{value.label}</p>
                <Badge
                  tone={
                    value.category === "sourced"
                      ? "ok"
                      : value.category === "unverified"
                        ? "danger"
                        : "warning"
                  }
                >
                  {value.category}
                </Badge>
              </div>
              <p className="mt-1 text-sm">
                {value.value} {value.unit}
              </p>
              <p className="mt-2 text-xs text-[rgb(var(--muted-foreground))]">
                {value.note}
              </p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
