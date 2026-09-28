import { Radio, Calendar } from 'lucide-react'
import { LiveBadge } from '@/components/live/LiveBadge'
import { LiveMatchBannerItem } from '@/components/dashboard/LiveMatchBannerItem'
import { WelcomeCard } from '@/components/dashboard/WelcomeCard'
import { AdminQuickActions } from '@/components/dashboard/QuickActions'
import { TopScorerCard } from '@/components/dashboard/TopScorerCard'
import { LeaderCard } from '@/components/dashboard/LeaderCard'
import { ActiveSuspensionsWidget } from '@/components/dashboard/ActiveSuspensionsWidget'
import { MiniLeaderboard } from '@/components/dashboard/MiniLeaderboard'
import { SectionHeader } from '@/components/dashboard/SectionHeader'
import { MiniMatchCard } from '@/components/dashboard/MiniMatchCard'
import type { AdminDashboardProps } from './types'

export function AdminDashboardContent({
  liveMatches, profile, myPlayer, myTeam, role, completedMatches, teams, upcomingMatches, topScorer, topTeam, recentMatches, season, pendingSpectatorsCount, myTeamId
}: AdminDashboardProps) {
  return (
    <div className="space-y-4">
      {/* Matchs en direct */}
      {liveMatches.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-red-500/30 p-4">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 animate-pulse" />
          <div className="flex items-center gap-2 mb-3">
            <Radio size={14} className="text-red-400 animate-pulse" />
            <span className="text-sm font-black uppercase tracking-wider">En direct</span>
            <LiveBadge size="sm" />
          </div>
          <div className="space-y-2">
            {liveMatches.map(match => <LiveMatchBannerItem key={match.id} match={match} />)}
          </div>
        </div>
      )}

      {/* Carte de bienvenue Admin */}
      {profile && (
        <WelcomeCard
          profile={profile}
          myPlayer={myPlayer}
          myTeam={myTeam}
          role={role ?? 'spectator'}
        />
      )}

      {/* Raccourcis Admin */}
      <AdminQuickActions
        completedCount={completedMatches.length}
        teamsCount={teams?.length ?? 0}
        pendingSpectatorsCount={pendingSpectatorsCount}
      />

      {/* Meilleur buteur / Leader du classement */}
      {(topScorer || topTeam) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {topScorer && <TopScorerCard scorer={topScorer} />}
          {topTeam && <LeaderCard team={topTeam} />}
        </div>
      )}

      {/* Suspensions en cours */}
      <ActiveSuspensionsWidget seasonId={season.id} isAdmin />

      {/* Top pronostiqueurs */}
      <MiniLeaderboard seasonId={season.id} />

      {/* Prochains matchs */}
      <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card">
        <SectionHeader title="Prochains matchs" href="/matches" />
        {upcomingMatches.length === 0 ? (
          <div className="empty-state py-6">
            <div className="empty-state-icon"><Calendar size={18} /></div>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Aucun match programmé</p>
          </div>
        ) : (
          <div className="stagger-fast">
            {upcomingMatches.slice(0, 4).map(match => (
              <MiniMatchCard key={match.id} match={match} variant="upcoming" myTeamId={myTeamId} />
            ))}
          </div>
        )}
      </div>

      {/* Derniers résultats */}
      {recentMatches.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card">
          <SectionHeader title="Derniers résultats" href="/matches" />
          <div className="stagger-fast">
            {recentMatches.map(match => (
              <MiniMatchCard key={match.id} match={match} variant="result" myTeamId={myTeamId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
