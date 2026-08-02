import { type CSSProperties, useMemo, useState } from "react";
import { Shield } from "lucide-react";
import { Badge } from "../../components/atoms/Badge";
import { MetricBar } from "../../components/atoms/MetricBar";
import { Tooltip } from "../../components/atoms/Tooltip";
import { TypeChip, TypeChipList } from "../../components/atoms/TypeChip";
import { typeAbbreviation } from "../../components/atoms/typeLabels";
import { DataSelect } from "../../components/molecules/DataSelect";
import { Panel, PanelHeader } from "../../components/molecules/Panel";
import type { ApplicationData } from "../../data/loaders";
import type { ChargedMove, FastMove } from "../../data/schemas/moves";
import type { PokemonSpecies, PokemonType } from "../../data/schemas/pokemon";
import { simulateRocketLineupExperimental } from "../../domain/battle/engine";
import type { BattleEvent, BattleStrategy } from "../../domain/battle/types";
import { analyzeMoveset } from "../../domain/moves/analytics";
import type { PokemonBuild } from "../../domain/pokemon/types";
import { calculateEffectiveStats } from "../../domain/stats/effectiveStats";
import { typeColor } from "../../domain/types/typeColors";
import { integer, number } from "../../lib/format";
import { moveMaps } from "../shared/dataHelpers";

type SlotState = {
  speciesId: string;
  fastMoveId: string;
  chargedOneId: string;
  chargedTwoId: string;
};

type SlotBuild = {
  species: PokemonSpecies;
  fastMove: FastMove;
  chargedMoves: [ChargedMove, ChargedMove];
};

export function PairBuilder({ data }: { data: ApplicationData }) {
  const maps = useMemo(() => moveMaps(data), [data]);
  const [trainerLevel, setTrainerLevel] = useState(50);
  const [strategy, setStrategy] = useState<BattleStrategy>("charge-asap");
  const [lineupId, setLineupId] = useState(data.rocket.lineups[0]?.id ?? "");
  const [leadSlot, setLeadSlot] = useState(() =>
    initialSlot(data.pokemon.candidates[0], data),
  );
  const [backupSlot, setBackupSlot] = useState(() =>
    initialSlot(data.pokemon.candidates[1], data),
  );
  const lead = resolveSlot(leadSlot, data, maps);
  const backup = resolveSlot(backupSlot, data, maps);
  const lineup =
    data.rocket.lineups.find((candidate) => candidate.id === lineupId) ??
    data.rocket.lineups[0];
  const boundedTrainerLevel = Math.min(50, Math.max(1, trainerLevel));
  const result = useMemo(
    () =>
      simulateRocketLineupExperimental({
        lead: toPokemonBuild(lead, boundedTrainerLevel),
        backup: toPokemonBuild(backup, boundedTrainerLevel),
        lineup,
        mechanics: data.mechanics,
        rocketOpponents: data.pokemon.rocketOpponents,
        moves: data.moves,
        strategy,
      }),
    [
      backup,
      boundedTrainerLevel,
      data.mechanics,
      data.moves,
      data.pokemon.rocketOpponents,
      lead,
      lineup,
      strategy,
    ],
  );

  return (
    <div className="grid gap-4">
      <Panel>
        <PanelHeader
          title="Battle Simulation"
          subtitle="Experimental Rocket simulation for a two-Pokemon team. Third slot remains outside calculations."
          right={<Badge tone="warning">Experimental</Badge>}
        />
        <div className="grid gap-3 p-3 md:grid-cols-3">
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
            label="Strategy"
            value={strategy}
            onChange={(value) => setStrategy(value as BattleStrategy)}
            options={[
              { value: "charge-asap", label: "Charge ASAP" },
              {
                value: "fastest-expected-knockout",
                label: "Fastest expected knockout",
              },
              { value: "shield-breaker", label: "Shield breaker" },
              { value: "preserve-lead", label: "Preserve lead" },
              { value: "minimal-interaction", label: "Minimal interaction" },
            ]}
          />
          <div className="flex flex-wrap items-end gap-2">
            <Badge tone="info">Trainer Level {trainerLevel}</Badge>
            <Badge tone="warning">{strategy}</Badge>
            <Badge tone="danger">Third slot unavailable</Badge>
          </div>
        </div>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-2">
        <TeamSlot
          role="Lead"
          slot={leadSlot}
          build={lead}
          data={data}
          maps={maps}
          trainerLevel={trainerLevel}
          onChange={setLeadSlot}
        />
        <TeamSlot
          role="Backup"
          slot={backupSlot}
          build={backup}
          data={data}
          maps={maps}
          trainerLevel={trainerLevel}
          onChange={setBackupSlot}
        />
      </div>
      <Panel className="p-3">
        <div className="grid gap-3 md:grid-cols-[minmax(260px,360px)_1fr]">
          <DataSelect
            label="Rocket Lineup"
            value={lineup.id}
            onChange={setLineupId}
            options={data.rocket.lineups.map((candidate) => ({
              value: candidate.id,
              label: `${candidate.trainerName} · ${candidate.sourceAgreement}`,
            }))}
          />
          <div className="grid content-end gap-1">
            <h3 className="text-sm font-semibold">Rocket Lineup</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="info">{lineup.trainerName}</Badge>
              <span className="font-semibold text-[rgb(var(--foreground))]">
                {lineup.slots
                  .map((slot) => formatLineupBranch(slot.pokemonIds[0]))
                  .join(" -> ")}
              </span>
              <Badge tone="warning">Assumptions</Badge>
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-[rgb(var(--border))] pt-3">
          <h3 className="mb-3 text-sm font-semibold">
            Battle Simulation Result
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">Experimental simulation</Badge>
            <Badge tone={result.outcome === "win" ? "ok" : "danger"}>
              {result.outcome === "win" ? "Win" : "Loss"}
            </Badge>
            <Badge tone="info">{lead.species.name} lead</Badge>
            <Badge tone="info">{backup.species.name} backup</Badge>
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <PreviewMetric label="Turns" value={integer(result.totalTurns)} />
          <PreviewMetric
            label="Clock"
            value={`${number(result.wallClockSeconds)}s`}
          />
          <PreviewMetric
            label="Fast attacks"
            value={integer(result.fastAttacksUsed)}
          />
          <PreviewMetric
            label="Charged attacks"
            value={integer(result.chargedAttacksUsed)}
          />
        </div>
        <BattleTimeline events={result.events} totalTurns={result.totalTurns} />
      </Panel>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-[rgb(var(--muted)/0.18)] px-3 py-2">
      <div className="text-[10px] font-semibold uppercase text-[rgb(var(--muted-foreground))]">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-[rgb(var(--foreground))]">
        {value}
      </div>
    </div>
  );
}

function BattleTimeline({
  events,
  totalTurns,
}: {
  events: BattleEvent[];
  totalTurns: number;
}) {
  const maxTurn = Math.max(totalTurns, 1);
  const playerFastAttacks = playerFastAttackSpans(events);
  const opponentFastAttacks = opponentFastAttackSpans(events);
  const playerChargedAttacks = events.filter(
    (event) => event.actor === "player" && event.kind === "charged-attack",
  );
  const opponentChargedAttacks = events.filter(
    (event) => event.actor === "rocket" && event.kind === "charged-attack",
  );
  const playerShields = events.filter(
    (event) => event.actor === "player" && event.kind === "shield",
  );
  const opponentShields = events.filter(
    (event) => event.actor === "rocket" && event.kind === "shield",
  );
  const hpSegments = battleHpSegments(events, maxTurn);
  const playerPokemonSegments = pokemonTransitionSegments(
    events,
    maxTurn,
    "player",
  );
  const opponentPokemonSegments = pokemonTransitionSegments(
    events,
    maxTurn,
    "opponent",
  );
  const tickInterval = maxTurn <= 60 ? 10 : 20;
  const turnTicks = Array.from(
    { length: Math.floor(maxTurn) + 1 },
    (_, index) => index,
  );
  const ticks = Array.from(
    { length: Math.floor(maxTurn / tickInterval) + 1 },
    (_, index) => index * tickInterval,
  );

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h4 className="text-xs font-semibold uppercase text-[rgb(var(--muted-foreground))]">
          Timeline
        </h4>
      </div>
      <div
        className="relative min-h-28 rounded border border-[rgb(var(--border))] bg-[rgb(var(--muted)/0.12)] px-5 py-4"
        aria-label={`Battle timeline from 0.0 seconds to ${number(maxTurn * 0.5)} seconds`}
      >
        <div className="text-[11px] font-semibold uppercase text-[rgb(var(--muted-foreground))]">
          Player
        </div>
        <PokemonTransitionTrack
          ariaLabel="Player active Pokemon"
          segments={playerPokemonSegments}
          maxTurn={maxTurn}
        />
        <FastAttackTrack
          ariaLabel="Player fast attack triggers"
          spans={playerFastAttacks}
          chargedAttacks={playerChargedAttacks}
          chargedAttackAriaLabel="Player charged attack spans"
          shields={playerShields}
          shieldAriaLabel="Player shield uses"
          maxTurn={maxTurn}
          labelForEvent={playerNameFromFastAttack}
        />
        <TimelineAxis
          turnTicks={turnTicks}
          labeledTicks={ticks}
          hpSegments={hpSegments}
          playerPokemonSegments={playerPokemonSegments}
          opponentPokemonSegments={opponentPokemonSegments}
          maxTurn={maxTurn}
        />
        <FastAttackTrack
          ariaLabel="Opponent fast attack triggers"
          spans={opponentFastAttacks}
          chargedAttacks={opponentChargedAttacks}
          chargedAttackAriaLabel="Opponent charged attack spans"
          shields={opponentShields}
          shieldAriaLabel="Opponent shield uses"
          maxTurn={maxTurn}
          labelForEvent={opponentNameFromFastAttack}
        />
        <PokemonTransitionTrack
          ariaLabel="Opponent active Pokemon"
          segments={opponentPokemonSegments}
          maxTurn={maxTurn}
        />
        <div className="text-[11px] font-semibold uppercase text-[rgb(var(--muted-foreground))]">
          Opponent
        </div>
      </div>
    </div>
  );
}

function TimelineAxis({
  turnTicks,
  labeledTicks,
  hpSegments,
  playerPokemonSegments,
  opponentPokemonSegments,
  maxTurn,
}: {
  turnTicks: number[];
  labeledTicks: number[];
  hpSegments: BattleHpSegment[];
  playerPokemonSegments: PokemonTransitionSegment[];
  opponentPokemonSegments: PokemonTransitionSegment[];
  maxTurn: number;
}) {
  return (
    <div className="relative h-40">
      <TimelineHpAreas
        segments={hpSegments}
        playerPokemonSegments={playerPokemonSegments}
        opponentPokemonSegments={opponentPokemonSegments}
        maxTurn={maxTurn}
      />
      <div className="absolute left-0 right-0 top-1/2 h-px bg-[rgb(var(--muted-foreground)/0.72)]" />
      {turnTicks.map((tick) => (
        <span
          key={tick}
          className={`absolute top-1/2 w-px -translate-x-1/2 -translate-y-1/2 bg-[rgb(var(--muted-foreground)/0.72)] ${
            tick % 2 === 0 ? "h-4" : "h-2.5"
          }`}
          style={{ left: `${(tick / maxTurn) * 100}%` }}
          aria-hidden="true"
        />
      ))}
      {labeledTicks.map((tick) => (
        <div
          key={tick}
          className="absolute top-[calc(50%+14px)] -translate-x-1/2 text-[11px] font-semibold text-[rgb(var(--muted-foreground))]"
          style={{ left: `${(tick / maxTurn) * 100}%` }}
        >
          <span>{number(tick * 0.5)}s</span>
        </div>
      ))}
    </div>
  );
}

function PokemonTransitionTrack({
  ariaLabel,
  segments,
  maxTurn,
}: {
  ariaLabel: string;
  segments: PokemonTransitionSegment[];
  maxTurn: number;
}) {
  return (
    <div className="relative h-7" aria-label={ariaLabel}>
      {segments.map((segment, index) => {
        const left = (segment.startTurn / maxTurn) * 100;
        const width = ((segment.endTurn - segment.startTurn) / maxTurn) * 100;
        const color = typeColor(segment.types[0] ?? "normal");

        return (
          <span
            key={`${segment.name}-${segment.startTurn}-${index}`}
            className="absolute top-1/2 flex h-5 -translate-y-1/2 items-center overflow-hidden rounded-full px-2 text-[11px] font-semibold shadow-sm"
            style={{
              backgroundColor: color.bg,
              color: color.text,
              left: `${left}%`,
              width: `max(42px, calc(${width}% - 1px))`,
            }}
            aria-label={`${segment.name} active from ${number(segment.startTurn * 0.5)} to ${number(segment.endTurn * 0.5)} seconds`}
          >
            <span className="truncate">{segment.name}</span>
          </span>
        );
      })}
    </div>
  );
}

function TimelineHpAreas({
  segments,
  playerPokemonSegments,
  opponentPokemonSegments,
  maxTurn,
}: {
  segments: BattleHpSegment[];
  playerPokemonSegments: PokemonTransitionSegment[];
  opponentPokemonSegments: PokemonTransitionSegment[];
  maxTurn: number;
}) {
  const playerAreas = hpAreasForPokemonSegments(
    segments,
    playerPokemonSegments,
    maxTurn,
    "player",
  );
  const opponentAreas = hpAreasForPokemonSegments(
    segments,
    opponentPokemonSegments,
    maxTurn,
    "opponent",
  );

  return (
    <svg
      className="absolute inset-0 h-full w-full overflow-visible"
      viewBox="0 0 1000 160"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {playerAreas.map((area) => (
        <path key={area.key} d={area.path} fill={area.color} />
      ))}
      {opponentAreas.map((area) => (
        <path key={area.key} d={area.path} fill={area.color} />
      ))}
    </svg>
  );
}

function FastAttackTrack({
  ariaLabel,
  spans,
  chargedAttacks,
  chargedAttackAriaLabel,
  shields,
  shieldAriaLabel,
  maxTurn,
  labelForEvent,
}: {
  ariaLabel: string;
  spans: FastAttackSpan[];
  chargedAttacks: BattleEvent[];
  chargedAttackAriaLabel: string;
  shields: BattleEvent[];
  shieldAriaLabel: string;
  maxTurn: number;
  labelForEvent: (event: BattleEvent) => string;
}) {
  return (
    <div className="relative h-8" aria-label={ariaLabel}>
      <div className="absolute left-0 right-0 top-1/2 h-px bg-[rgb(var(--border)/0.72)]" />
      {spans.map((span, index) => {
        const actor = labelForEvent(span.event);
        const left = (span.startTurn / maxTurn) * 100;
        const width = Math.max(
          0.75,
          ((span.endTurn - span.startTurn) / maxTurn) * 100,
        );
        const color = span.event.moveType
          ? typeColor(span.event.moveType).bar
          : "rgb(var(--danger))";

        return (
          <Tooltip
            key={`${span.startTurn}-${span.endTurn}-${index}`}
            content={attackTooltipContent(span.event, "Fast attack")}
            contentClassName={attackTooltipClassName()}
            contentStyle={attackTooltipStyle(span.event)}
          >
            <span
              className="absolute top-1/2 h-3 -translate-y-1/2 cursor-help rounded-full opacity-82 outline-none ring-offset-2 ring-offset-[rgb(var(--background))] focus-visible:ring-2"
              style={{
                backgroundColor: color,
                left: `${left}%`,
                width: `max(1px, calc(${width}% - 1px))`,
              }}
              tabIndex={0}
              aria-label={`${actor} fast attack from ${number(span.startTurn * 0.5)} to ${number(span.endTurn * 0.5)} seconds`}
            />
          </Tooltip>
        );
      })}
      {chargedAttacks.length > 0 ? (
        <div className="absolute inset-0" aria-label={chargedAttackAriaLabel}>
          {chargedAttacks.map((event, index) => {
            const left = (event.turn / maxTurn) * 100;
            const durationTurns = Math.max(0.5, event.durationTurns ?? 0.5);
            const width = (durationTurns / maxTurn) * 100;
            const color = event.moveType
              ? typeColor(event.moveType).bg
              : "rgb(var(--primary))";

            return (
              <Tooltip
                key={`${event.turn}-${event.kind}-${index}`}
                content={attackTooltipContent(event, "Charged attack")}
                contentClassName={attackTooltipClassName()}
                contentStyle={attackTooltipStyle(event)}
              >
                <span
                  className="absolute top-1/2 z-10 h-5 -translate-y-1/2 cursor-help rounded-full shadow-sm outline-none ring-offset-2 ring-offset-[rgb(var(--background))] focus-visible:ring-2"
                  style={{
                    backgroundColor: color,
                    left: `${left}%`,
                    width: `max(1px, calc(${width}% - 1px))`,
                  }}
                  tabIndex={0}
                  aria-label={`${chargedAttackName(event)} charged attack from ${number(event.turn * 0.5)} to ${number((event.turn + durationTurns) * 0.5)} seconds`}
                />
              </Tooltip>
            );
          })}
        </div>
      ) : null}
      {shields.length > 0 ? (
        <div className="absolute inset-0" aria-label={shieldAriaLabel}>
          {shields.map((event, index) => {
            const durationTurns = Math.max(0, event.durationTurns ?? 0);
            const left = ((event.turn + durationTurns / 2) / maxTurn) * 100;

            return (
              <span
                key={`${event.turn}-${event.kind}-${index}`}
                className="absolute top-1/2 z-20 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--panel)/0.92)] text-[rgb(var(--foreground))] shadow-sm"
                style={{ left: `${left}%` }}
                aria-label={`Shield used at ${number((event.turn + durationTurns / 2) * 0.5)} seconds`}
              >
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function attackTooltipContent(event: BattleEvent, label: string) {
  const attack = event.attack;
  const name = attack?.name ?? chargedAttackName(event);
  const rows = attack
    ? [
        ["Base damage", formatDamageValue(attack.baseDamage)],
        ["STAB bonus", signedDamageValue(attack.stabBonus)],
        ["Type bonus", signedDamageValue(attack.typeBonus)],
        ["Total output", formatDamageValue(attack.totalDamage)],
      ]
    : [["Damage", "Not available"]];

  return (
    <div className="min-w-44">
      <div className="text-[10px] font-semibold uppercase opacity-75">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold">{name}</div>
      <div className="mt-2 grid gap-1 text-xs">
        {rows.map(([rowLabel, value]) => (
          <div
            key={rowLabel}
            className="flex items-center justify-between gap-4"
          >
            <span className="opacity-78">{rowLabel}</span>
            <span className="font-semibold tabular-nums">{value}</span>
          </div>
        ))}
      </div>
      {attack ? (
        <div className="mt-2 border-t border-current/18 pt-1.5 text-[10px] opacity-75">
          STAB x{number(attack.stabMultiplier)} · Type x
          {number(attack.typeMultiplier)}
        </div>
      ) : null}
    </div>
  );
}

function attackTooltipClassName() {
  return "z-50 rounded-md border px-3 py-2 text-xs shadow-lg";
}

function attackTooltipStyle(event: BattleEvent): CSSProperties {
  const color = event.moveType ? typeColor(event.moveType) : undefined;
  return {
    backgroundColor: color?.bg ?? "rgb(var(--panel))",
    borderColor: color?.bar ?? "rgb(var(--border))",
    color: color?.text ?? "rgb(var(--foreground))",
  };
}

function formatDamageValue(value: number) {
  return number(value);
}

function signedDamageValue(value: number) {
  if (value === 0) {
    return "0";
  }
  return `${value > 0 ? "+" : ""}${number(value)}`;
}

type FastAttackSpan = {
  startTurn: number;
  endTurn: number;
  event: BattleEvent;
};

type BattleHpSegment = {
  startTurn: number;
  endTurn: number;
  playerRatio: number;
  playerEndRatio: number;
  playerTypes: PokemonType[];
  opponentRatio: number;
  opponentEndRatio: number;
  opponentTypes: PokemonType[];
  interpolation: "step" | "attack";
};

type BattleHpSample = {
  turn: number;
  playerHp: number;
  playerMaxHp: number;
  playerTypes: PokemonType[];
  opponentHp: number;
  opponentMaxHp: number;
  opponentTypes: PokemonType[];
  interpolationFromPrevious: "step" | "attack";
};

type PokemonTransitionSegment = {
  name: string;
  startTurn: number;
  endTurn: number;
  types: PokemonType[];
};

function pokemonTransitionSegments(
  events: BattleEvent[],
  maxTurn: number,
  side: "player" | "opponent",
): PokemonTransitionSegment[] {
  const entries = events
    .map((event) => pokemonTransitionEntry(event, side))
    .filter((entry): entry is Omit<PokemonTransitionSegment, "endTurn"> =>
      Boolean(entry),
    )
    .sort((a, b) => a.startTurn - b.startTurn);

  return entries.flatMap((entry, index) => {
    const endTurn = entries[index + 1]?.startTurn ?? maxTurn;
    if (endTurn <= entry.startTurn) {
      return [];
    }
    return [{ ...entry, endTurn }];
  });
}

function pokemonTransitionEntry(
  event: BattleEvent,
  side: "player" | "opponent",
): Omit<PokemonTransitionSegment, "endTurn"> | undefined {
  if (side === "player") {
    if (
      event.actor !== "player" ||
      !["pokemon-enter", "switch"].includes(event.kind)
    ) {
      return undefined;
    }
    const name = event.message.match(/^(.+?) enters/)?.[1];
    return name
      ? {
          name,
          startTurn: event.turn,
          types: event.playerTypes ?? ["normal"],
        }
      : undefined;
  }

  if (event.kind === "pokemon-enter" && event.actor === "player") {
    const name = event.message.match(/against .+?'s (.+?)\./)?.[1];
    return name
      ? {
          name,
          startTurn: event.turn,
          types: event.opponentTypes ?? ["normal"],
        }
      : undefined;
  }

  if (event.kind === "pokemon-enter" && event.actor === "rocket") {
    const name = event.message.match(/sends in (.+?)\./)?.[1];
    return name
      ? {
          name,
          startTurn: event.turn,
          types: event.opponentTypes ?? ["normal"],
        }
      : undefined;
  }

  return undefined;
}

function battleHpSegments(
  events: BattleEvent[],
  maxTurn: number,
): BattleHpSegment[] {
  const samples: BattleHpSample[] = [];
  let currentSample: BattleHpSample | undefined;
  const pendingFastStarts = new Map<BattleEvent["actor"], BattleHpSample>();

  for (const event of events) {
    const eventSample = hpSampleFromEvent(event);
    if (!eventSample) {
      continue;
    }

    if (event.kind === "fast-start") {
      pendingFastStarts.set(event.actor, eventSample);
      samples.push(eventSample);
      currentSample = eventSample;
      continue;
    }

    if (event.kind === "fast-resolve" && currentSample) {
      const fastStartSample = pendingFastStarts.get(event.actor);
      const startSample = fastStartSample
        ? {
            ...currentSample,
            turn: fastStartSample.turn,
            interpolationFromPrevious: "step" as const,
          }
        : undefined;
      if (startSample && hpChanged(startSample, eventSample)) {
        const endSample = {
          ...eventSample,
          interpolationFromPrevious: "attack" as const,
        };
        samples.push(startSample, endSample);
        currentSample = endSample;
        pendingFastStarts.delete(event.actor);
        continue;
      }
      pendingFastStarts.delete(event.actor);
    }

    const durationTurns = event.durationTurns ?? 0;
    if (
      event.kind === "charged-attack" &&
      durationTurns > 0 &&
      currentSample &&
      hpChanged(currentSample, eventSample)
    ) {
      const startSample = {
        ...currentSample,
        turn: event.turn,
        interpolationFromPrevious: "step" as const,
      };
      const endSample = {
        ...eventSample,
        turn: event.turn + durationTurns,
        interpolationFromPrevious: "attack" as const,
      };
      samples.push(startSample, endSample);
      currentSample = endSample;
      continue;
    }

    samples.push(eventSample);
    currentSample = eventSample;
  }

  const mergedSamples = coalesceHpSamples(samples);

  return mergedSamples.flatMap((sample, index) => {
    const nextSample = mergedSamples[index + 1];
    const nextTurn = nextSample?.turn ?? maxTurn;
    if (nextTurn <= sample.turn) {
      return [];
    }

    return [
      {
        startTurn: sample.turn,
        endTurn: nextTurn,
        playerRatio: hpRatio(sample.playerHp, sample.playerMaxHp),
        playerEndRatio: hpRatio(
          nextSample?.playerHp ?? sample.playerHp,
          nextSample?.playerMaxHp ?? sample.playerMaxHp,
        ),
        playerTypes: sample.playerTypes,
        opponentRatio: hpRatio(sample.opponentHp, sample.opponentMaxHp),
        opponentEndRatio: hpRatio(
          nextSample?.opponentHp ?? sample.opponentHp,
          nextSample?.opponentMaxHp ?? sample.opponentMaxHp,
        ),
        opponentTypes: sample.opponentTypes,
        interpolation: nextSample?.interpolationFromPrevious ?? "step",
      },
    ];
  });
}

function hpSampleFromEvent(event: BattleEvent): BattleHpSample | undefined {
  const {
    playerHp,
    playerMaxHp,
    playerTypes,
    opponentHp,
    opponentMaxHp,
    opponentTypes,
  } = event;
  if (
    playerHp === undefined ||
    playerMaxHp === undefined ||
    opponentHp === undefined ||
    opponentMaxHp === undefined
  ) {
    return undefined;
  }

  return {
    turn: event.turn,
    playerHp,
    playerMaxHp,
    playerTypes: playerTypes ?? ["normal"],
    opponentHp,
    opponentMaxHp,
    opponentTypes: opponentTypes ?? ["normal"],
    interpolationFromPrevious: "step",
  };
}

function hpChanged(previous: BattleHpSample, next: BattleHpSample) {
  return (
    previous.playerHp !== next.playerHp ||
    previous.opponentHp !== next.opponentHp
  );
}

function coalesceHpSamples(samples: BattleHpSample[]) {
  const sortedSamples = samples
    .map((sample, order) => ({ sample, order }))
    .sort((a, b) => a.sample.turn - b.sample.turn || a.order - b.order)
    .map((item) => item.sample);
  const coalesced: BattleHpSample[] = [];
  for (const sample of sortedSamples) {
    const previous = coalesced[coalesced.length - 1];
    if (previous && sameHpSampleState(previous, sample)) {
      coalesced[coalesced.length - 1] = {
        ...sample,
        interpolationFromPrevious:
          previous.interpolationFromPrevious === "attack" ||
          sample.interpolationFromPrevious === "attack"
            ? "attack"
            : "step",
      };
    } else {
      coalesced.push(sample);
    }
  }

  return coalesced;
}

function sameHpSampleState(a: BattleHpSample, b: BattleHpSample) {
  return (
    a.turn === b.turn &&
    a.playerHp === b.playerHp &&
    a.playerMaxHp === b.playerMaxHp &&
    a.opponentHp === b.opponentHp &&
    a.opponentMaxHp === b.opponentMaxHp &&
    sameTypes(a.playerTypes, b.playerTypes) &&
    sameTypes(a.opponentTypes, b.opponentTypes)
  );
}

function sameTypes(a: PokemonType[], b: PokemonType[]) {
  return a.length === b.length && a.every((type, index) => type === b[index]);
}

function hpRatio(hp: number, maxHp: number) {
  return Math.max(0, Math.min(1, hp / Math.max(1, maxHp)));
}

function hpAreasForPokemonSegments(
  hpSegments: BattleHpSegment[],
  pokemonSegments: PokemonTransitionSegment[],
  maxTurn: number,
  side: "player" | "opponent",
) {
  return pokemonSegments.flatMap((pokemonSegment, index) => {
    const clipped = clipHpSegmentsToPokemon(
      hpSegments,
      pokemonSegment,
      side,
      maxTurn,
    );
    const path = hpAreaPath(clipped, maxTurn, side);
    if (!path) {
      return [];
    }
    return [
      {
        key: `${side}-${pokemonSegment.name}-${pokemonSegment.startTurn}-${index}`,
        path,
        color: typeColor(pokemonSegment.types[0] ?? "normal").bar,
      },
    ];
  });
}

function clipHpSegmentsToPokemon(
  hpSegments: BattleHpSegment[],
  pokemonSegment: PokemonTransitionSegment,
  side: "player" | "opponent",
  maxTurn: number,
) {
  return hpSegments.flatMap((segment) => {
    if (
      segment.startTurn < pokemonSegment.startTurn ||
      segment.startTurn >= pokemonSegment.endTurn
    ) {
      return [];
    }

    const startTurn = Math.max(segment.startTurn, pokemonSegment.startTurn);
    const endTurn = Math.min(segment.endTurn, pokemonSegment.endTurn);
    if (endTurn <= startTurn) {
      return [];
    }
    const reachesPokemonBoundary =
      pokemonSegment.endTurn < maxTurn && endTurn === pokemonSegment.endTurn;
    return [
      {
        ...segment,
        startTurn,
        endTurn,
        playerEndRatio:
          side === "player" && reachesPokemonBoundary
            ? 0
            : segment.playerEndRatio,
        playerTypes: pokemonSegment.types,
        opponentEndRatio:
          side === "opponent" && reachesPokemonBoundary
            ? 0
            : segment.opponentEndRatio,
        opponentTypes: pokemonSegment.types,
      },
    ];
  });
}

function hpAreaPath(
  segments: BattleHpSegment[],
  maxTurn: number,
  side: "player" | "opponent",
) {
  if (segments.length === 0) {
    return "";
  }

  const centerY = 80;
  const height = 76;
  const minY = side === "player" ? centerY - height : centerY;
  const maxY = side === "player" ? centerY : centerY + height;
  const samples = hpSamplePoints(
    segments,
    maxTurn,
    side,
    centerY,
    height,
    minY,
    maxY,
  );
  const first = samples[0];
  const last = samples[samples.length - 1];
  const commands = [`M ${first.x} ${centerY}`, `L ${first.x} ${first.y}`];

  if (samples.length === 1) {
    commands.push(`L ${last.x} ${last.y}`);
  } else {
    for (const segment of segments) {
      const startRatio =
        side === "player" ? segment.playerRatio : segment.opponentRatio;
      const endRatio =
        side === "player" ? segment.playerEndRatio : segment.opponentEndRatio;
      const startY = yForHpRatio(startRatio, side, centerY, height, minY, maxY);
      const endY = yForHpRatio(endRatio, side, centerY, height, minY, maxY);
      const startX = xForTurn(segment.startTurn, maxTurn);
      const endX = xForTurn(segment.endTurn, maxTurn);

      if (segment.interpolation === "attack") {
        const deltaX = endX - startX;
        commands.push(
          `C ${startX + deltaX * 0.38} ${startY}, ${startX + deltaX * 0.62} ${endY}, ${endX} ${endY}`,
        );
      } else {
        commands.push(`L ${endX} ${startY}`, `L ${endX} ${endY}`);
      }
    }
  }

  commands.push(`L ${last.x} ${centerY}`, "Z");
  return commands.join(" ");
}

type HpSamplePoint = {
  x: number;
  y: number;
};

function hpSamplePoints(
  segments: BattleHpSegment[],
  maxTurn: number,
  side: "player" | "opponent",
  centerY: number,
  height: number,
  minY: number,
  maxY: number,
): HpSamplePoint[] {
  const points = segments.map((segment) => {
    const x = xForTurn(segment.startTurn, maxTurn);
    const ratio =
      side === "player" ? segment.playerRatio : segment.opponentRatio;
    const y = yForHpRatio(ratio, side, centerY, height, minY, maxY);

    return { x, y };
  });
  const last = segments[segments.length - 1];
  const ratio = side === "player" ? last.playerEndRatio : last.opponentEndRatio;
  const y = yForHpRatio(ratio, side, centerY, height, minY, maxY);

  return [...points, { x: xForTurn(last.endTurn, maxTurn), y }];
}

function yForHpRatio(
  ratio: number,
  side: "player" | "opponent",
  centerY: number,
  height: number,
  minY: number,
  maxY: number,
) {
  return clampNumber(
    side === "player" ? centerY - ratio * height : centerY + ratio * height,
    minY,
    maxY,
  );
}

function xForTurn(turn: number, maxTurn: number) {
  return (turn / maxTurn) * 1000;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function playerFastAttackSpans(events: BattleEvent[]): FastAttackSpan[] {
  const starts = events.filter(
    (event) => event.actor === "player" && event.kind === "fast-start",
  );
  const resolves = events.filter(
    (event) => event.actor === "player" && event.kind === "fast-resolve",
  );

  return resolves.map((event, index) => ({
    startTurn:
      starts[index]?.turn ??
      Math.max(0, event.turn - inferredPlayerFastTurns(resolves)),
    endTurn: event.turn,
    event,
  }));
}

function opponentFastAttackSpans(events: BattleEvent[]): FastAttackSpan[] {
  const starts = events.filter(
    (event) => event.actor === "rocket" && event.kind === "fast-start",
  );
  const resolves = events.filter(
    (event) => event.actor === "rocket" && event.kind === "fast-resolve",
  );

  return resolves.map((event, index) => ({
    startTurn: starts[index]?.turn ?? Math.max(0, event.turn - 1),
    endTurn: event.turn,
    event,
  }));
}

function inferredPlayerFastTurns(events: BattleEvent[]) {
  const first = events[0];
  const second = events[1];
  return first && second ? Math.max(1, second.turn - first.turn) : 1;
}

function playerNameFromFastAttack(event: BattleEvent) {
  return event.message.match(/^([^ ]+)/)?.[1] ?? "Player";
}

function opponentNameFromFastAttack(event: BattleEvent) {
  return (
    event.message.match(/^([^;]+?) uses/)?.[1] ??
    event.message.match(/^([^;]+?) attacks/)?.[1] ??
    "Opponent"
  );
}

function chargedAttackName(event: BattleEvent) {
  return event.message.match(/uses ([^;]+?)(?:;|$)/)?.[1] ?? "Charged";
}

function TeamSlot({
  role,
  slot,
  build,
  data,
  maps,
  trainerLevel,
  onChange,
}: {
  role: string;
  slot: SlotState;
  build: SlotBuild;
  data: ApplicationData;
  maps: ReturnType<typeof moveMaps>;
  trainerLevel: number;
  onChange: (slot: SlotState) => void;
}) {
  const analytics = analyzeMoveset(
    build.species,
    build.fastMove,
    build.chargedMoves,
  );
  const stats = calculateEffectiveStats(
    build.species,
    Math.min(50, Math.max(1, trainerLevel)),
  );
  const fastMoves = legalFastMoves(build.species, maps);
  const chargedMoves = legalChargedMoves(build.species, maps);
  const maxFastMetric = Math.max(
    analytics.fast.damagePerTurn,
    analytics.fast.energyPerTurn,
    1,
  );

  function setSpecies(speciesId: string) {
    const species = data.pokemon.candidates.find(
      (candidate) => candidate.id === speciesId,
    );
    if (!species) {
      return;
    }
    onChange(initialSlot(species, data));
  }

  function setChargedOne(chargedOneId: string) {
    onChange(normalizeChargedPair({ ...slot, chargedOneId }, chargedMoves));
  }

  function setChargedTwo(chargedTwoId: string) {
    onChange(normalizeChargedPair({ ...slot, chargedTwoId }, chargedMoves));
  }

  return (
    <Panel>
      <PanelHeader
        title={role}
        subtitle={`${build.species.name} · CP ${integer(stats.cp)} · ${integer(stats.hp)} HP`}
        right={<TypeChipList types={build.species.types} compact />}
      />
      <div className="grid gap-3 p-3">
        <DataSelect
          label={`${role} Pokemon`}
          value={build.species.id}
          onChange={setSpecies}
          options={data.pokemon.candidates.map((candidate) => ({
            value: candidate.id,
            label: candidate.name,
          }))}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <DataSelect
              label="Fast move"
              value={build.fastMove.id}
              selectedType={build.fastMove.type}
              onChange={(fastMoveId) => onChange({ ...slot, fastMoveId })}
              options={fastMoves.map((move) => ({
                value: move.id,
                label: fastMoveLabel(move),
                type: move.type,
              }))}
            />
          </div>
          <DataSelect
            label="Charged 1"
            value={build.chargedMoves[0].id}
            selectedType={build.chargedMoves[0].type}
            onChange={setChargedOne}
            options={chargedMoves.map((move) => ({
              value: move.id,
              label: chargedMoveLabel(move),
              type: move.type,
            }))}
          />
          <DataSelect
            label="Charged 2"
            value={build.chargedMoves[1].id}
            selectedType={build.chargedMoves[1].type}
            onChange={setChargedTwo}
            options={chargedMoves.map((move) => ({
              value: move.id,
              label: chargedMoveLabel(move),
              type: move.type,
            }))}
          />
        </div>
        <TeamSlotSummary
          analytics={analytics}
          fastMove={build.fastMove}
          chargedMoves={build.chargedMoves}
          maxFastMetric={maxFastMetric}
        />
      </div>
    </Panel>
  );
}

function TeamSlotSummary({
  analytics,
  fastMove,
  chargedMoves,
  maxFastMetric,
}: {
  analytics: ReturnType<typeof analyzeMoveset>;
  fastMove: FastMove;
  chargedMoves: [ChargedMove, ChargedMove];
  maxFastMetric: number;
}) {
  const timings = chargedMoves.map((chargedMove) => ({
    chargedMove,
    timing: analytics.timings.find(
      (item) => item.chargedMoveId === chargedMove.id,
    ),
  }));

  return (
    <div className="grid gap-3 rounded bg-[rgb(var(--muted)/0.18)] px-3 py-2.5">
      <div>
        <h4 className="mb-2 text-[10px] font-semibold uppercase text-[rgb(var(--muted-foreground))]">
          Fast move pressure
        </h4>
        <div className="grid gap-2">
          <MetricBar
            label="DPT"
            value={analytics.fast.damagePerTurn}
            max={maxFastMetric}
            color={typeColor(fastMove.type).bar}
          />
          <MetricBar
            label="EPT"
            value={analytics.fast.energyPerTurn}
            max={maxFastMetric}
            color={typeColor(fastMove.type).bar}
          />
        </div>
      </div>
      <div>
        <h4 className="mb-2 text-[10px] font-semibold uppercase text-[rgb(var(--muted-foreground))]">
          First charged attack
        </h4>
        <div className="grid gap-2 sm:grid-cols-2">
          {timings.map(({ chargedMove, timing }) => (
            <div
              key={chargedMove.id}
              className="flex min-w-0 items-center gap-2 rounded bg-[rgb(var(--panel)/0.58)] px-2 py-1.5 text-xs"
            >
              <TypeChip
                type={chargedMove.type}
                label={chargedMove.name}
                compact
              />
              <span className="shrink-0 text-[rgb(var(--muted-foreground))]">
                {timing
                  ? `${timing.firstFastMoveCount} fast / ${number(timing.firstSeconds)}s`
                  : "No timing"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function initialSlot(
  species: PokemonSpecies,
  data: ApplicationData,
): SlotState {
  const maps = moveMaps(data);
  const fastMoves = legalFastMoves(species, maps);
  const chargedMoves = legalChargedMoves(species, maps);
  return {
    speciesId: species.id,
    fastMoveId: fastMoves[0].id,
    chargedOneId: chargedMoves[0].id,
    chargedTwoId: chargedMoves[1]?.id ?? chargedMoves[0].id,
  };
}

function resolveSlot(
  slot: SlotState,
  data: ApplicationData,
  maps: ReturnType<typeof moveMaps>,
): SlotBuild {
  const species =
    data.pokemon.candidates.find(
      (candidate) => candidate.id === slot.speciesId,
    ) ?? data.pokemon.candidates[0];
  const fastMoves = legalFastMoves(species, maps);
  const chargedMoves = legalChargedMoves(species, maps);
  const fastMove =
    fastMoves.find((move) => move.id === slot.fastMoveId) ?? fastMoves[0];
  const chargedOne =
    chargedMoves.find((move) => move.id === slot.chargedOneId) ??
    chargedMoves[0];
  const chargedTwo =
    chargedMoves.find(
      (move) => move.id === slot.chargedTwoId && move.id !== chargedOne.id,
    ) ??
    chargedMoves.find((move) => move.id !== chargedOne.id) ??
    chargedOne;

  return { species, fastMove, chargedMoves: [chargedOne, chargedTwo] };
}

function toPokemonBuild(slot: SlotBuild, level: number): PokemonBuild {
  return {
    species: slot.species,
    level,
    ivs: { attack: 15, defense: 15, stamina: 15 },
    shadow: false,
    bestBuddy: false,
    fastMove: slot.fastMove,
    chargedMoves: slot.chargedMoves,
  };
}

function normalizeChargedPair(slot: SlotState, chargedMoves: ChargedMove[]) {
  if (slot.chargedOneId !== slot.chargedTwoId) {
    return slot;
  }
  const replacement = chargedMoves.find(
    (move) => move.id !== slot.chargedOneId,
  );
  return replacement ? { ...slot, chargedTwoId: replacement.id } : slot;
}

function legalFastMoves(
  species: PokemonSpecies,
  maps: ReturnType<typeof moveMaps>,
) {
  const moves = species.fastMoves
    .map((id) => maps.fast.get(id))
    .filter((move): move is FastMove => Boolean(move));
  if (moves.length === 0) {
    throw new Error(`${species.name} has no resolvable fast move`);
  }
  return moves;
}

function legalChargedMoves(
  species: PokemonSpecies,
  maps: ReturnType<typeof moveMaps>,
) {
  const moves = species.chargedMoves
    .map((id) => maps.charged.get(id))
    .filter((move): move is ChargedMove => Boolean(move));
  if (moves.length < 2) {
    throw new Error(`${species.name} needs at least two charged moves`);
  }
  return moves;
}

function fastMoveLabel(move: FastMove) {
  return `${move.name} · ${typeAbbreviation(move.type)} · P${move.power} · +E${move.energyGain} · ${move.turns}T`;
}

function chargedMoveLabel(move: ChargedMove) {
  return `${move.name} · ${typeAbbreviation(move.type)} · P${move.power} · E${move.energyCost}`;
}

function formatLineupBranch(id: string) {
  return id
    .split(/[-_]/)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
