import { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/atoms/Badge";
import { TypeChipList } from "../../components/atoms/TypeChip";
import { DataSelect } from "../../components/molecules/DataSelect";
import { Panel, PanelHeader } from "../../components/molecules/Panel";
import type { ApplicationData } from "../../data/loaders";
import { simulateRocketLineupExperimental } from "../../domain/battle/engine";
import type {
  BattleEvent,
  BattleOutcome,
} from "../../domain/battle/types";
import type { PokemonBuild } from "../../domain/pokemon/types";
import {
  bestMovesetForStrategy,
  pokemonFocusStrategyLabels,
  type PokemonFocusStrategy,
} from "../../domain/ranking/pokemonFocus";
import { integer, number } from "../../lib/format";
import { battleStrategyForFocus } from "../shared/strategyMapping";
import {
  persistSelectedBattleTeam,
  readSelectedBattleTeam,
} from "../shared/teamSelection";

export function BattleTimelineView({ data }: { data: ApplicationData }) {
  const [trainerLevel, setTrainerLevel] = useState(50);
  const [strategy, setStrategy] =
    useState<PokemonFocusStrategy>("fastest-victory");
  const [lineupId, setLineupId] = useState(data.rocket.lineups[0]?.id ?? "");
  const initialTeam = useMemo(() => readSelectedBattleTeam(data), [data]);
  const [leadId, setLeadId] = useState(initialTeam.leadId);
  const [backupId, setBackupId] = useState(initialTeam.backupId);
  const lead =
    data.pokemon.candidates.find((candidate) => candidate.id === leadId) ??
    data.pokemon.candidates[0];
  const backup =
    data.pokemon.candidates.find((candidate) => candidate.id === backupId) ??
    data.pokemon.candidates[1] ??
    data.pokemon.candidates[0];
  const lineup =
    data.rocket.lineups.find((candidate) => candidate.id === lineupId) ??
    data.rocket.lineups[0];
  const boundedTrainerLevel = Math.min(50, Math.max(1, trainerLevel));
  const candidateLevel = candidatePokemonLevel(boundedTrainerLevel);
  const battleStrategy = battleStrategyForFocus(strategy);
  const result = useMemo(
    () =>
      simulateRocketLineupExperimental({
        lead: toRecommendedBuild(data, lead.id, candidateLevel, strategy),
        backup: toRecommendedBuild(
          data,
          backup.id,
          candidateLevel,
          strategy,
        ),
        lineup,
        mechanics: data.mechanics,
        rocketOpponents: data.pokemon.rocketOpponents,
        moves: data.moves,
        strategy: battleStrategy,
        trainerLevel: boundedTrainerLevel,
      }),
    [
      backup.id,
      battleStrategy,
      boundedTrainerLevel,
      candidateLevel,
      data,
      lead.id,
      lineup,
      strategy,
    ],
  );

  useEffect(() => {
    persistSelectedBattleTeam({ leadId: lead.id, backupId: backup.id });
  }, [backup.id, lead.id]);

  return (
    <div className="grid gap-4">
      <Panel>
        <PanelHeader
          title="Battle Timeline"
          subtitle={`${lead.name} / ${backup.name} into ${lineup.trainerName}`}
          right={<Badge tone="warning">Experimental</Badge>}
        />
        <div className="grid gap-3 p-3 lg:grid-cols-5">
          <label className="grid gap-1 text-xs font-medium text-[rgb(var(--muted-foreground))]">
            Trainer Level
            <input
              type="number"
              min={1}
              max={50}
              value={trainerLevel}
              onChange={(event) => setTrainerLevel(Number(event.target.value))}
              className="h-9 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--panel))] px-2 text-sm text-[rgb(var(--foreground))]"
            />
          </label>
          <DataSelect
            label="Lead"
            value={lead.id}
            onChange={setLeadId}
            options={pokemonOptions(data)}
          />
          <DataSelect
            label="Backup"
            value={backup.id}
            onChange={setBackupId}
            options={pokemonOptions(data)}
          />
          <DataSelect
            label="Rocket Lineup"
            value={lineup.id}
            onChange={setLineupId}
            options={data.rocket.lineups.map((candidate) => ({
              value: candidate.id,
              label: `${candidate.trainerName} · ${candidate.sourceAgreement}`,
            }))}
          />
          <DataSelect
            label="Strategy"
            value={strategy}
            onChange={(value) => setStrategy(value as PokemonFocusStrategy)}
            options={Object.entries(pokemonFocusStrategyLabels).map(
              ([value, label]) => ({
                value,
                label,
              }),
            )}
          />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel>
          <PanelHeader
            title="Event Log"
            subtitle={`${integer(result.events.length)} events · ${formatOutcome(result.outcome)}`}
            right={
              <Badge tone={result.outcome === "win" ? "ok" : "danger"}>
                {formatOutcome(result.outcome)}
              </Badge>
            }
          />
          <div className="grid grid-cols-2 gap-3 border-t border-[rgb(var(--border))] p-3 sm:grid-cols-4">
            <TimelineMetric label="Turns" value={integer(result.totalTurns)} />
            <TimelineMetric
              label="Clock"
              value={`${number(result.wallClockSeconds)}s`}
            />
            <TimelineMetric
              label="Fast"
              value={integer(result.fastAttacksUsed)}
            />
            <TimelineMetric
              label="Charged"
              value={integer(result.chargedAttacksUsed)}
            />
          </div>
          <div className="border-t border-[rgb(var(--border))]">
            <EventTable events={result.events} />
          </div>
        </Panel>

        <div className="grid content-start gap-4">
          <Panel>
            <PanelHeader
              title="Team"
              subtitle={`${pokemonFocusStrategyLabels[strategy]} · Pokemon Level ${candidateLevel} · Trainer Level ${boundedTrainerLevel}`}
            />
            <div className="grid gap-3 p-3">
              <PokemonSummary
                label="Lead"
                build={toRecommendedBuild(
                  data,
                  lead.id,
                  candidateLevel,
                  strategy,
                )}
              />
              <PokemonSummary
                label="Backup"
                build={toRecommendedBuild(
                  data,
                  backup.id,
                  candidateLevel,
                  strategy,
                )}
              />
              <div className="rounded bg-[rgb(var(--muted)/0.18)] px-3 py-2 text-xs">
                <div className="font-semibold text-[rgb(var(--foreground))]">
                  {lineup.trainerName}
                </div>
                <div className="mt-1 text-[rgb(var(--muted-foreground))]">
                  {lineup.slots
                    .map((slot) => formatLineupBranch(slot.pokemonIds[0]))
                    .join(" -> ")}
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="Assumptions"
              subtitle={`${result.confidence} · ${result.simulationVersion}`}
            />
            <ul className="grid gap-2 p-3 text-xs text-[rgb(var(--muted-foreground))]">
              {result.assumptionsUsed.map((assumption) => (
                <li
                  key={assumption}
                  className="rounded bg-[rgb(var(--muted)/0.16)] px-2 py-1.5"
                >
                  {assumption}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function EventTable({ events }: { events: BattleEvent[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left text-xs">
        <thead className="bg-[rgb(var(--muted)/0.28)] text-[rgb(var(--muted-foreground))]">
          <tr>
            <th className="px-3 py-2 font-semibold">Turn</th>
            <th className="px-3 py-2 font-semibold">Clock</th>
            <th className="px-3 py-2 font-semibold">Actor</th>
            <th className="px-3 py-2 font-semibold">Event</th>
            <th className="px-3 py-2 font-semibold">HP</th>
            <th className="px-3 py-2 font-semibold">Move</th>
            <th className="px-3 py-2 font-semibold">Message</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, index) => (
            <tr
              key={`${event.turn}-${event.actor}-${event.kind}-${index}`}
              className="border-t border-[rgb(var(--border))] align-top"
            >
              <td className="px-3 py-2 font-semibold tabular-nums">
                {number(event.turn)}
              </td>
              <td className="px-3 py-2 tabular-nums">
                {number(event.wallClockSeconds)}s
              </td>
              <td className="px-3 py-2">
                <Badge
                  tone={
                    event.actor === "player"
                      ? "info"
                      : event.actor === "rocket"
                        ? "warning"
                        : "ok"
                  }
                >
                  {event.actor}
                </Badge>
              </td>
              <td className="px-3 py-2">{formatEventKind(event.kind)}</td>
              <td className="px-3 py-2 tabular-nums">
                {event.playerHp !== undefined && event.opponentHp !== undefined
                  ? `${event.playerHp}/${event.playerMaxHp} · ${event.opponentHp}/${event.opponentMaxHp}`
                  : "-"}
              </td>
              <td className="px-3 py-2">
                {event.attack ? (
                  <div>
                    <div className="font-semibold text-[rgb(var(--foreground))]">
                      {event.attack.name}
                    </div>
                    <div className="text-[rgb(var(--muted-foreground))]">
                      {integer(event.attack.totalDamage)} dmg · STAB x
                      {number(event.attack.stabMultiplier)} · Type x
                      {number(event.attack.typeMultiplier)}
                    </div>
                  </div>
                ) : (
                  "-"
                )}
              </td>
              <td className="max-w-md px-3 py-2 text-[rgb(var(--muted-foreground))]">
                {event.message}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PokemonSummary({
  label,
  build,
}: {
  label: string;
  build: PokemonBuild;
}) {
  return (
    <div className="rounded bg-[rgb(var(--muted)/0.18)] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-semibold uppercase text-[rgb(var(--muted-foreground))]">
            {label}
          </div>
          <div className="mt-1 text-sm font-semibold">{build.species.name}</div>
        </div>
        <TypeChipList types={build.species.types} compact />
      </div>
      <div className="mt-2 text-xs text-[rgb(var(--muted-foreground))]">
        {build.fastMove.name} ·{" "}
        {build.chargedMoves.map((move) => move.name).join(" / ")}
      </div>
    </div>
  );
}

function TimelineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-[rgb(var(--muted)/0.18)] px-3 py-2">
      <div className="text-[10px] font-semibold uppercase text-[rgb(var(--muted-foreground))]">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function toRecommendedBuild(
  data: ApplicationData,
  speciesId: string,
  level: number,
  strategy: PokemonFocusStrategy,
): PokemonBuild {
  const species =
    data.pokemon.candidates.find((candidate) => candidate.id === speciesId) ??
    data.pokemon.candidates[0];
  const moveset = bestMovesetForStrategy(species, data.moves, strategy, 40);

  return {
    species,
    level,
    ivs: { attack: 15, defense: 15, stamina: 15 },
    shadow: false,
    bestBuddy: false,
    fastMove: moveset.fastMove,
    chargedMoves: moveset.chargedMoves,
  };
}

function pokemonOptions(data: ApplicationData) {
  return [...data.pokemon.candidates]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((candidate) => ({
      value: candidate.id,
      label: candidate.name,
    }));
}

function candidatePokemonLevel(trainerLevel: number) {
  return Math.min(40, trainerLevel);
}

function formatOutcome(outcome: BattleOutcome) {
  if (outcome === "win") {
    return "Proxy clear";
  }
  if (outcome === "loss") {
    return "Proxy fail";
  }
  if (outcome === "third-slot-required") {
    return "Third slot required";
  }
  return "Not simulated";
}

function formatEventKind(kind: BattleEvent["kind"]) {
  return kind
    .split("-")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatLineupBranch(id: string) {
  return id
    .split(/[-_]/)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
