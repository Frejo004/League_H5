import { Radio, Calendar } from 'lucide-react'
import { LiveBadge } from '@/components/live/LiveBadge'
import { LiveMatchBannerItem } from '@/components/dashboard/LiveMatchBannerItem'
import { WelcomeCard } from '@/components/dashboard/WelcomeCard'
import { SuspensionBanner } from '@/components/dashboard/SuspensionBanner'
import { CaptainQuickActions } from '@/components/dashboard/QuickActions'
import { TopScorerCard } from '@/components/dashboard/TopScorerCard'
import { LeaderCard } from '@/components/dashboard/LeaderCard'
import { ActiveSuspensionsWidget } from '@/components/dashboard/ActiveSuspensionsWidget'
import { MiniLeaderboard } from '@/components/dashboard/MiniLeaderboard'
import { NextMatchCountdown } from '@/components/dashboard/NextMatchCountdown'
import { MiniMatchCard } from '@/components/dashboard/MiniMatchCard'
import { MyStatsCard } from '@/components/dashboard/MyStatsCard'
import { MyTeamCard } from '@/components/dashboard/MyTeamCard'
import type { CaptainDashboardProps } from './types'

export function CaptainDashboardContent({
  liveMatches, profile, myPlayer, myTeam, role, myTeamId, hasTeam, myUpcomingMatches, myRecentMatches, myNextMatch, isCaptain, season, topScorer, topTeam
}: CaptainDashboardProps) {
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

      {/* Carte de bienvenue Capitaine */}
      {profile && (
        <WelcomeCard
          profile={profile}
          myPlayer={myPlayer}
          myTeam={myTeam}
          role={role ?? 'spectator'}
        />
      )}

      {/* Bannière suspension active */}
      {profile?.id && season?.id && (
        <SuspensionBanner userId={profile.id} seasonId={season.id} />
      )}

      {/* Raccourcis Capitaine */}
      {myTeam && (
        <CaptainQuickActions myTeam={myTeam} nextMatch={myNextMatch ?? undefined} myTeamId={myTeamId} />
      )}

      {/* Meilleur buteur / Leader du classement */}
      {(topScorer || topTeam) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {topScorer && <TopScorerCard scorer={topScorer} />}
          {topTeam && <LeaderCard team={topTeam} />}
        </div>
      )}

      {/* Suspensions en cours */}
      <ActiveSuspensionsWidget seasonId={season.id} />

      {/* Top pronostiqueurs */}
      <MiniLeaderboard seasonId={season.id} />

      {/* Mes matchs */}
      {hasTeam && (myUpcomingMatches.length > 0 || myRecentMatches.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Calendar size={14} className={myTeam ? "" : "text-text-muted"} style={myTeam ? { color: myTeam.color } : undefined} />
            <span className="text-xs font-black uppercase tracking-widest text-text-muted">Mes matchs</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Mes prochains matchs */}
            {myUpcomingMatches.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card">
                <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">À venir</span>
                  {myTeam && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${myTeam.color}15`, color: myTeam.color, border: `1px solid ${myTeam.color}30` }}>
                      {myTeam.name}
                    </span>
                  )}
                </div>
                <div className="stagger-fast">
                  {myNextMatch?.scheduled_at && (
                    <NextMatchCountdown match={myNextMatch} teamId={myTeamId} isCaptain={isCaptain} />
                  )}
                  {myUpcomingMatches.slice(0, 3).map(match => (
                    <MiniMatchCard key={match.id} match={match} variant="upcoming" myTeamId={myTeamId} />
                  ))}
                </div>
              </div>
            )}

            {/* Mes derniers résultats */}
            {myRecentMatches.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card">
                <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Résultats</span>
                  {myTeam && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${myTeam.color}15`, color: myTeam.color, border: `1px solid ${myTeam.color}30` }}>
                      {myTeam.name}
                    </span>
                  )}
                </div>
                <div className="stagger-fast">
                  {myRecentMatches.slice(0, 3).map(match => (
                    <MiniMatchCard key={match.id} match={match} variant="result" myTeamId={myTeamId} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Capitaine */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {hasTeam && myPlayer && season && (
          <MyStatsCard playerId={myPlayer.id} seasonId={season.id} />
        )}
        {hasTeam && myTeamId && season && (
          <MyTeamCard teamId={myTeamId} seasonId={season.id} />
        )}
      </div>
    </div>
  );
}
