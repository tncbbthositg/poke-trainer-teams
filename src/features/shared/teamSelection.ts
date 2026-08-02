import type { ApplicationData } from "../../data/loaders";

export type SelectedBattleTeam = {
  leadId: string;
  backupId: string;
};

const selectedBattleTeamStorageKey = "rocket-pair-lab:selected-battle-team";

export function selectedBattleTeamHref(team: SelectedBattleTeam) {
  const params = new URLSearchParams({
    lead: team.leadId,
    backup: team.backupId,
  });

  return `#/pairs?${params.toString()}`;
}

export function readSelectedBattleTeam(data: ApplicationData) {
  const fallback = defaultSelectedBattleTeam(data);
  const persisted = readPersistedSelectedBattleTeam(data);
  const linked = readHashSelectedBattleTeam(data);

  return linked ?? persisted ?? fallback;
}

export function persistSelectedBattleTeam(team: SelectedBattleTeam) {
  try {
    window.localStorage.setItem(
      selectedBattleTeamStorageKey,
      JSON.stringify(team),
    );
  } catch {
    // Browser storage can be unavailable in private or locked-down contexts.
  }
}

export function defaultSelectedBattleTeam(data: ApplicationData) {
  return {
    leadId: data.pokemon.candidates[0]?.id ?? "",
    backupId:
      data.pokemon.candidates[1]?.id ?? data.pokemon.candidates[0]?.id ?? "",
  };
}

function readHashSelectedBattleTeam(
  data: ApplicationData,
): SelectedBattleTeam | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const [, query = ""] = window.location.hash.split("?");
  const params = new URLSearchParams(query);
  const leadId = validCandidateId(data, params.get("lead"));
  const backupId = validCandidateId(data, params.get("backup"));

  return leadId || backupId
    ? normalizeSelectedBattleTeam(data, {
        leadId: leadId ?? undefined,
        backupId: backupId ?? undefined,
      })
    : undefined;
}

function readPersistedSelectedBattleTeam(
  data: ApplicationData,
): SelectedBattleTeam | undefined {
  try {
    const persisted = window.localStorage.getItem(selectedBattleTeamStorageKey);
    if (!persisted) {
      return undefined;
    }

    const parsed = JSON.parse(persisted) as Partial<SelectedBattleTeam>;

    return normalizeSelectedBattleTeam(data, parsed);
  } catch {
    return undefined;
  }
}

function normalizeSelectedBattleTeam(
  data: ApplicationData,
  candidate: Partial<SelectedBattleTeam>,
): SelectedBattleTeam {
  const fallback = defaultSelectedBattleTeam(data);
  const leadId = validCandidateId(data, candidate.leadId) ?? fallback.leadId;
  const backupId =
    validCandidateId(data, candidate.backupId) ??
    firstOtherCandidateId(data, leadId) ??
    fallback.backupId;

  return {
    leadId,
    backupId:
      backupId === leadId
        ? firstOtherCandidateId(data, leadId) ?? backupId
        : backupId,
  };
}

function firstOtherCandidateId(data: ApplicationData, speciesId: string) {
  return data.pokemon.candidates.find((candidate) => candidate.id !== speciesId)
    ?.id;
}

function validCandidateId(data: ApplicationData, value: unknown) {
  return typeof value === "string" &&
    data.pokemon.candidates.some((candidate) => candidate.id === value)
    ? value
    : undefined;
}
