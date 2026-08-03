import type { PokemonType } from "../../data/schemas/pokemon";
import type { BattleEvent } from "../../domain/battle/types";

export type BattleHpSegment = {
  startTurn: number;
  endTurn: number;
  playerHp: number;
  playerEndHp: number;
  playerMaxHp: number;
  playerRatio: number;
  playerEndRatio: number;
  playerTypes: PokemonType[];
  opponentHp: number;
  opponentEndHp: number;
  opponentMaxHp: number;
  opponentRatio: number;
  opponentEndRatio: number;
  opponentTypes: PokemonType[];
  interpolation: "step" | "attack";
};

export type TimelineHoverState = {
  playerHp: number;
  playerMaxHp: number;
  opponentHp: number;
  opponentMaxHp: number;
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

export function hpStateAtTurn(
  segments: BattleHpSegment[],
  turn: number,
): TimelineHoverState | undefined {
  const segment =
    segments.find((item, index) => {
      const isLast = index === segments.length - 1;
      return turn >= item.startTurn && (turn < item.endTurn || isLast);
    }) ?? segments.at(-1);
  if (!segment) {
    return undefined;
  }
  const spanTurns = Math.max(1, segment.endTurn - segment.startTurn);
  const progress = clampNumber((turn - segment.startTurn) / spanTurns, 0, 1);
  const attackProgress = segment.interpolation === "attack" ? progress : 0;

  return {
    playerHp: Math.round(
      interpolateNumber(segment.playerHp, segment.playerEndHp, attackProgress),
    ),
    playerMaxHp: segment.playerMaxHp,
    opponentHp: Math.round(
      interpolateNumber(
        segment.opponentHp,
        segment.opponentEndHp,
        attackProgress,
      ),
    ),
    opponentMaxHp: segment.opponentMaxHp,
  };
}

export function battleHpSegments(
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
          interpolationFromPrevious: "step" as const,
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
        playerHp: sample.playerHp,
        playerEndHp: nextSample?.playerHp ?? sample.playerHp,
        playerMaxHp: sample.playerMaxHp,
        playerRatio: hpRatio(sample.playerHp, sample.playerMaxHp),
        playerEndRatio: hpRatio(
          nextSample?.playerHp ?? sample.playerHp,
          nextSample?.playerMaxHp ?? sample.playerMaxHp,
        ),
        playerTypes: sample.playerTypes,
        opponentHp: sample.opponentHp,
        opponentEndHp: nextSample?.opponentHp ?? sample.opponentHp,
        opponentMaxHp: sample.opponentMaxHp,
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

function interpolateNumber(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
