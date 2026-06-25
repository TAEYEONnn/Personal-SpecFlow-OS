export const ACTIVE_TEAM_STORAGE_KEY = "specflow:lastTeamId";
export const ACTIVE_TEAM_COOKIE_KEY = "specflow_atid";

export type TeamSummary = { id: string; name: string };

export function resolveInitialTeamId(
  teams: TeamSummary[],
  savedTeamId: string | null,
): string | null {
  if (savedTeamId && teams.some((team) => team.id === savedTeamId))
    return savedTeamId;
  if (teams.length === 1) return teams[0].id;
  return teams[0]?.id ?? null;
}
