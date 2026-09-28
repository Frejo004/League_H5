import type { MatchWithTeams } from '@/hooks/useMatches'
import type { ScorerRow } from '@/hooks/useScorers'
import type { StandingRow } from '@/hooks/useStandings'
import type { useAuth } from '@/hooks/useAuth'
import type { useMyTeam } from '@/hooks/useMyTeam'
import type { useTeams } from '@/hooks/useTeams'
import type { useSpectators } from '@/hooks/useSpectators'
import type { useActiveSeason } from '@/hooks/useSeasons'

export interface BaseDashboardProps {
  liveMatches: MatchWithTeams[];
  profile: ReturnType<typeof useAuth>['profile'];
  myPlayer: ReturnType<typeof useMyTeam>['myPlayer'];
  myTeam: ReturnType<typeof useMyTeam>['myTeam'];
  role: ReturnType<typeof useAuth>['role'];
  myTeamId: ReturnType<typeof useMyTeam>['myTeamId'];
}

export interface AdminDashboardProps extends BaseDashboardProps {
  completedMatches: MatchWithTeams[];
  teams: ReturnType<typeof useTeams>['data'];
  upcomingMatches: MatchWithTeams[];
  spectators: ReturnType<typeof useSpectators>['data'];
  topScorer: ScorerRow | undefined;
  topTeam: StandingRow | undefined;
  recentMatches: MatchWithTeams[];
  season: NonNullable<ReturnType<typeof useActiveSeason>['data']>;
  pendingSpectatorsCount: number;
  handleTestNotification: () => void;
}

export interface CaptainDashboardProps extends BaseDashboardProps {
  hasTeam: boolean;
  myUpcomingMatches: MatchWithTeams[];
  myRecentMatches: MatchWithTeams[];
  myNextMatch: MatchWithTeams | null;
  isCaptain: boolean;
  season: NonNullable<ReturnType<typeof useActiveSeason>['data']>;
  upcomingMatches: MatchWithTeams[];
  topScorer: ScorerRow | undefined;
  topTeam: StandingRow | undefined;
}

export interface PlayerDashboardProps extends CaptainDashboardProps {
  recentMatches: MatchWithTeams[];
}
