import { useState, useEffect, useMemo, useCallback } from 'react'
import { Trophy } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMatches, type MatchWithTeams } from '@/hooks/useMatches'
import { useTeams } from '@/hooks/useTeams'
import { useScorers } from '@/hooks/useScorers'
import { useStandings } from '@/hooks/useStandings'
import { useRealtimeMatches, useRealtimeTeams } from '@/hooks/useRealtime'
import { useMyTeam } from '@/hooks/useMyTeam'
import { useAuth } from '@/hooks/useAuth'
import { useSpectators } from '@/hooks/useSpectators'
import { SkeletonKpiGrid, SkeletonCard, SkeletonMatchCard } from '@/components/ui/SkeletonLoader'
import { useNotificationSW } from '@/hooks/useNotificationSW'
import { AdminDashboardContent } from '@/components/dashboard/layouts/AdminDashboardContent'
import { CaptainDashboardContent } from '@/components/dashboard/layouts/CaptainDashboardContent'
import { PlayerDashboardContent } from '@/components/dashboard/layouts/PlayerDashboardContent'

export function DashboardPage() {
  const { data: season, isLoading: seasonLoading, isFetched } = useActiveSeason()
  const { data: matches } = useMatches(season?.id)
  const { data: teams } = useTeams(season?.id)
  const { data: scorers } = useScorers(season?.id)
  const { data: standings } = useStandings(season?.id)
  const { myTeamId, myTeam, myPlayer } = useMyTeam(season?.id)
  const { isCaptain, isAdmin, profile, role } = useAuth()
  const { sendNotification } = useNotificationSW(profile?.id)

  const handleTestNotification = () => {
    sendNotification(
      'Test League H5 🏆',
      'Ceci est une notification de test pour vérifier que tout fonctionne !',
      { url: '/dashboard', force: true }
    )
  }
  const { data: spectators } = useSpectators(isAdmin ? undefined : season?.id)

  const pendingSpectatorsCount = useMemo(() => {
    if (!isAdmin || !spectators) return 0
    return spectators.filter(s => s.status === 'pending').length
  }, [isAdmin, spectators])

  useRealtimeTeams(season?.id)
  useRealtimeMatches(season?.id)

  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000)
    return () => clearTimeout(t)
  }, [])

  const isLoading = seasonLoading && !timedOut && !isFetched

  // Fonction pour vérifier si un match concerne l'équipe de l'utilisateur
  const isMyTeamMatch = useCallback((match: MatchWithTeams, teamId: string | null) => {
    if (!teamId) return false
    return match.home_team_id === teamId || match.away_team_id === teamId
  }, [])

  // Calculer tous les tableaux avec useMemo pour éviter les mutations
  const completedMatches = useMemo(() =>
    (matches ?? []).filter(m => m.status === 'completed'),
    [matches]
  )
  const liveMatches = useMemo(() =>
    (matches ?? []).filter(m => m.status === 'live'),
    [matches]
  )
  const upcomingMatches = useMemo(() =>
    (matches ?? [])
      .filter(m => m.status === 'scheduled')
      .sort((a, b) => {
        // Prioriser les matchs de mon équipe
        const aIsMine = isMyTeamMatch(a, myTeamId)
        const bIsMine = isMyTeamMatch(b, myTeamId)
        if (aIsMine && !bIsMine) return -1
        if (!aIsMine && bIsMine) return 1

        // Puis trier par date
        if (a.scheduled_at && b.scheduled_at)
          return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        if (a.scheduled_at) return -1
        if (b.scheduled_at) return 1
        return a.matchday - b.matchday
      }),
    [matches, myTeamId, isMyTeamMatch]
  )
  const recentMatches = useMemo(() =>
    [...completedMatches]
      .filter(m => m.played_at)
      .sort((a, b) => {
        // Prioriser les matchs de mon équipe
        const aIsMine = isMyTeamMatch(a, myTeamId)
        const bIsMine = isMyTeamMatch(b, myTeamId)
        if (aIsMine && !bIsMine) return -1
        if (!aIsMine && bIsMine) return 1

        // Puis trier par date
        return new Date(b.played_at!).getTime() - new Date(a.played_at!).getTime()
      })
      .slice(0, 5),
    [completedMatches, myTeamId, isMyTeamMatch]
  )

  // Mes matchs (uniquement ceux de mon équipe)
  const myUpcomingMatches = useMemo(() =>
    upcomingMatches.filter(m => isMyTeamMatch(m, myTeamId)),
    [upcomingMatches, myTeamId, isMyTeamMatch]
  )
  const myRecentMatches = useMemo(() =>
    recentMatches.filter(m => isMyTeamMatch(m, myTeamId)),
    [recentMatches, myTeamId, isMyTeamMatch]
  )

  // Prochain match de mon équipe (capitaine / joueur)
  const myNextMatch = useMemo(() => {
    if (!myTeamId) return upcomingMatches[0] ?? null
    return upcomingMatches.find(m => m.home_team_id === myTeamId || m.away_team_id === myTeamId)
      ?? upcomingMatches[0]
      ?? null
  }, [upcomingMatches, myTeamId])

  const topScorer = scorers?.[0]
  const topTeam = standings?.[0]

  // Rôle effectif
  const hasTeam = !!myTeamId && !!myPlayer

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <SkeletonKpiGrid count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-0 overflow-hidden lg:col-span-2">
            {[1, 2, 3].map(i => <SkeletonMatchCard key={i} />)}
          </div>
          <div className="space-y-3">
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </div>
        </div>
      </div>
    )
  }

  if (!season) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <Trophy size={32} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-400 font-semibold">Aucune saison active</p>
          <p className="text-slate-600 text-sm mt-1">Contactez l'administrateur</p>
        </div>
      </div>
    )
  }

  // Rendu du tableau de bord en fonction du rôle
  return (
    <div className="space-y-4">
      {isAdmin ? (
        <AdminDashboardContent
          liveMatches={liveMatches}
          profile={profile}
          myPlayer={myPlayer}
          myTeam={myTeam}
          role={role}
          completedMatches={completedMatches}
          teams={teams}
          upcomingMatches={upcomingMatches}
          spectators={spectators}
          topScorer={topScorer}
          topTeam={topTeam}
          recentMatches={recentMatches}
          season={season}
          pendingSpectatorsCount={pendingSpectatorsCount}
          handleTestNotification={handleTestNotification}
          myTeamId={myTeamId}
        />
      ) : isCaptain ? (
        <CaptainDashboardContent
          liveMatches={liveMatches}
          profile={profile}
          myPlayer={myPlayer}
          myTeam={myTeam}
          role={role}
          myTeamId={myTeamId}
          hasTeam={hasTeam}
          myUpcomingMatches={myUpcomingMatches}
          myRecentMatches={myRecentMatches}
          myNextMatch={myNextMatch}
          isCaptain={isCaptain}
          season={season}
          upcomingMatches={upcomingMatches}
          topScorer={topScorer}
          topTeam={topTeam}
        />
      ) : (
        <PlayerDashboardContent
          liveMatches={liveMatches}
          profile={profile}
          myPlayer={myPlayer}
          myTeam={myTeam}
          role={role}
          myTeamId={myTeamId}
          hasTeam={hasTeam}
          myUpcomingMatches={myUpcomingMatches}
          myRecentMatches={myRecentMatches}
          myNextMatch={myNextMatch}
          isCaptain={isCaptain}
          season={season}
          upcomingMatches={upcomingMatches}
          topScorer={topScorer}
          topTeam={topTeam}
          recentMatches={recentMatches}
        />
      )}
    </div>
  )
}


