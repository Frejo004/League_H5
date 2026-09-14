import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Calendar, ChevronRight, Layout, UserCheck, History, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuth } from '@/hooks/useAuth'
import { usePlayersByTeam } from '@/hooks/usePlayers'
import { supabase } from '@/lib/supabase'
import { useMatches } from '@/hooks/useMatches'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { FORMATIONS } from '@/components/matches/formations'
import { PitchView } from '@/components/matches/MatchLineups'
import { useMatchLineups, useUpdateMatchLineup } from '@/hooks/useLineups'
import type { MatchWithTeams } from '@/hooks/useMatches'
import { pushLocal, useRealtimeTactics } from '@/hooks/useRealtime'
import { ResultBadge } from '@/components/ui/SharedBadges'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Team } from '@/types/database'
import { LineupHistoryDrawer } from '@/components/captain/LineupHistoryDrawer'
import { formatTime, formatDate } from '@/components/captain/dateHelpers'

// Type definitions for our broadcast data
type BroadcastType = 'formation' | 'player_selected'
type BroadcastData = {
  type: BroadcastType
  teamId: string
  captainName?: string
  formation?: string
  playerName?: string
  playerId?: string
}

export function TabTactique({ teamId, teamColor, seasonId, readonly = false }: { teamId: string, teamColor: string, seasonId: string, readonly?: boolean }) {
  const { profile, user } = useAuth()
  const { data: matches } = useMatches(seasonId)
  const { data: players } = usePlayersByTeam(teamId)
  const updateLineup = useUpdateMatchLineup()
  const [selectedHistoryMatch, setSelectedHistoryMatch] = useState<MatchWithTeams | null>(null)

  const nextMatch = useMemo(() => {
    return (matches ?? [])
      .filter(m => (m.home_team_id === teamId || m.away_team_id === teamId) && m.status === 'scheduled' && m.scheduled_at)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0]
  }, [matches, teamId])

  const { data: lineups, isLoading: lineupLoading } = useMatchLineups(nextMatch?.id || '')

  const teamLineup = useMemo(() => {
    return lineups?.filter(l => l.team_id === teamId) ?? []
  }, [lineups, teamId])

  // Realtime
  useRealtimeTactics(teamId, nextMatch?.id)

  // Broadcast tactical updates to other players — un seul canal souscrit,
  // réutilisé pour tous les envois (au lieu d'en créer un nouveau, jamais
  // nettoyé, à chaque appel).
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  useEffect(() => {
    if (!nextMatch?.id) return
    const channel = supabase.channel(`tactics-match-${nextMatch.id}`)
    channel.subscribe()
    broadcastChannelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
      broadcastChannelRef.current = null
    }
  }, [nextMatch?.id])

  const broadcastUpdate = useCallback((type: BroadcastType, data: Omit<BroadcastData, 'type' | 'teamId' | 'captainName'>) => {
    if (!nextMatch || !broadcastChannelRef.current) return
    broadcastChannelRef.current.send({
      type: 'broadcast',
      event: 'tactical_update',
      payload: { type, ...data, teamId, captainName: profile?.full_name ?? 'Le Capitaine' } satisfies BroadcastData
    })
  }, [teamId, nextMatch, profile])

  // Listen for broadcasts (for players)
  useEffect(() => {
    if (!nextMatch || !readonly) return
    const channel = supabase.channel(`tactics-match-${nextMatch.id}`)
    channel
      .on('broadcast', { event: 'tactical_update' }, ({ payload }) => {
        const data = payload as BroadcastData
        // On ne traite que si c'est notre équipe
        if (data.teamId !== teamId) { /* Do nothing if not for this team */ return }

        let title = 'Tactique mise à jour'
        let message = `${data.captainName} a modifié la formation.`

        if (data.type === 'player_selected') {
          if (data.playerId === profile?.id || data.playerId === user?.id) {
            title = 'Tu es titulaire ! ⚽'
            message = `Le capitaine t'a sélectionné pour le match contre ${nextMatch.home_team_id === teamId ? (nextMatch.away_team as unknown as Team)?.name : (nextMatch.home_team as unknown as Team)?.name}`
          } else {
            message = `${data.captainName} a sélectionné ${data.playerName} dans le 5 majeur.`
          }
        } else if (data.type === 'formation') {
          message = `${data.captainName} a choisi la formation ${data.formation}.`
        }

        pushLocal(title, message, `tactics-${nextMatch.id}`, `/my-team?tab=tactique`)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [nextMatch, readonly, teamId, profile, user])

  const currentFormation = useMemo(() => {
    const firstPos = teamLineup.find(l => l.is_starter && l.position?.includes(':'))?.position
    return firstPos?.split(':')[0] || '2-1-1'
  }, [teamLineup])

  // Matchs passés de l'équipe (terminés), triés du plus récent au plus ancien
  const pastMatches = useMemo(() => {
    return (matches ?? [])
      .filter(m => (m.home_team_id === teamId || m.away_team_id === teamId) && m.status === 'completed')
      .sort((a, b) => new Date(b.played_at ?? b.matchday).getTime() - new Date(a.played_at ?? a.matchday).getTime())
  }, [matches, teamId])

  if (lineupLoading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>

  if (!nextMatch) {
    return (
      <Card className="p-0 overflow-hidden">
        <EmptyState
          icon={<Calendar />}
          title="Aucun match programmé"
          description="La tactique sera disponible dès qu'un match sera planifié."
          className="py-16"
        />
      </Card>
    )
  }

  const handleSelectFormation = async (formationKey: string) => {
    try {
      const starters = teamLineup.filter(l => l.is_starter).map(l => l.player_id)
      const substitutes = teamLineup.filter(l => !l.is_starter).map(l => l.player_id)

      const formationCoords = FORMATIONS[formationKey].coords
      const startersWithPositions = starters.slice(0, 5).map((pid, idx) => ({
        id: pid,
        pos: `${formationKey}:${formationCoords[idx].pos}`
      }))

      await updateLineup.mutateAsync({
        matchId: nextMatch.id,
        teamId: teamId,
        starters: startersWithPositions,
        substitutes
      })

      broadcastUpdate('formation', { formation: FORMATIONS[formationKey].label })
    } catch (error) {
      console.error('Error updating formation:', error)
    }
  }

  const handleTogglePlayer = async (playerId: string) => {
    try {
      const starters = teamLineup.filter(l => l.is_starter).map(l => l.player_id)
      const substitutes = teamLineup.filter(l => !l.is_starter).map(l => l.player_id)

      let nextStarters = [...starters]
      let nextSubs = [...substitutes]
      const isAlreadyIn = starters.includes(playerId)
      const isAdding = !isAlreadyIn && !substitutes.includes(playerId)

      if (isAlreadyIn) {
        nextStarters = nextStarters.filter(id => id !== playerId)
        nextSubs = [...nextSubs, playerId]
      } else if (substitutes.includes(playerId)) {
        nextSubs = nextSubs.filter(id => id !== playerId)
        if (nextStarters.length < 5) nextStarters = [...nextStarters, playerId]
      } else {
        if (nextStarters.length < 5) nextStarters = [...nextStarters, playerId]
        else nextSubs = [...nextSubs, playerId]
      }

      const formationCoords = FORMATIONS[currentFormation].coords
      const finalStarters = nextStarters.slice(0, 5).map((pid, idx) => ({
        id: pid,
        pos: `${currentFormation}:${formationCoords[idx].pos}`
      }))

      await updateLineup.mutateAsync({
        matchId: nextMatch.id,
        teamId: teamId,
        starters: finalStarters,
        substitutes: nextSubs
      })

      if (isAdding && !isAlreadyIn) {
        const p = players?.find(p => p.id === playerId)
        broadcastUpdate('player_selected', {
          playerId: p?.user_id ?? undefined,
          playerName: `${p?.first_name} ${p?.last_name}`
        })
      }
    } catch (error) {
      console.error('Error toggling player:', error)
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Drawer historique compo */}
      {selectedHistoryMatch && (
        <LineupHistoryDrawer
          match={selectedHistoryMatch}
          teamId={teamId}
          teamColor={teamColor}
          onClose={() => setSelectedHistoryMatch(null)}
        />
      )}

      {/* Header Match Compact */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 rounded-2xl bg-white/2 border border-white/5">
        <div className="text-center md:text-left">
          <p className="text-[9px] font-black text-primary-500 uppercase tracking-widest">Prochain Match</p>
          <h3 className="text-base font-black text-text-primary uppercase tracking-tight">
            {nextMatch.home_team.name} <span className="text-text-muted mx-1">vs</span> {nextMatch.away_team.name}
          </h3>
        </div>
        <div className="text-center md:text-right">
          <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest">
            {formatDate(nextMatch.scheduled_at!)} · {formatTime(nextMatch.scheduled_at!)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        <div className="space-y-8">
          {/* Sélecteur de Tactique */}
          <div className="space-y-4">
            <div className="px-2">
              <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                <Layout size={12} className="text-primary-500" />
                1. Choisir la Tactique
              </h4>
              <div className={clsx(
                "grid gap-3",
                readonly ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-4"
              )}>
                {Object.keys(FORMATIONS).map(key => (
                  <button
                    key={key}
                    disabled={updateLineup.isPending || readonly}
                    onClick={() => handleSelectFormation(key)}
                    className={clsx(
                      "relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300",
                      currentFormation === key
                        ? "bg-primary-600 border-primary-500 text-white shadow-[0_0_20px_rgba(200,241,53,0.2)]"
                        : "glass-morphism border-white/5 text-text-muted hover:bg-white/5",
                      readonly && "cursor-default"
                    )}
                  >
                    <span className="text-sm font-black tracking-tight">{FORMATIONS[key].label}</span>
                    <span className="text-[8px] font-bold uppercase opacity-60 mt-0.5">{FORMATIONS[key].style}</span>
                    {currentFormation === key && (
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fiche de Match (Sélection Joueurs) */}
          <div className="space-y-4">
            <div className="px-2 flex items-center justify-between">
              <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
                <UserCheck size={12} className="text-primary-500" />
                2. Fiche de Match (5 Majeur)
              </h4>
              <span className="text-[10px] font-black text-text-secondary bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                {teamLineup.filter(l => l.is_starter).length} / 5 titulaires
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(players ?? [])
                .sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99))
                .map(player => {
                  const isStarter = teamLineup.some(l => l.player_id === player.id && l.is_starter)
                  const isSub = teamLineup.some(l => l.player_id === player.id && !l.is_starter)

                  return (
                    <button
                      key={player.id}
                      disabled={updateLineup.isPending || readonly}
                      onClick={() => handleTogglePlayer(player.id)}
                      className={clsx(
                        "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group",
                        isStarter ? "bg-primary-500/10 border-primary-500/30" :
                          isSub ? "bg-blue-500/10 border-blue-500/30" :
                            "bg-white/2 border-white/5 opacity-60 hover:opacity-100 hover:bg-white/5",
                        readonly && "cursor-default"
                      )}
                    >
                      <div className={clsx(
                        "w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all",
                        isStarter || isSub ? "bg-black/60 text-white" : "bg-white/5 text-slate-600"
                      )}>
                        {player.jersey_number ?? '—'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={clsx("text-xs font-bold truncate", (isStarter || isSub) ? "text-text-primary" : "text-text-secondary")}>
                          {player.first_name} {player.last_name}
                        </p>
                      </div>
                      {isStarter ? (
                        <div className="px-2 py-1 rounded-lg bg-primary-500 text-black text-[8px] font-black uppercase">Starter</div>
                      ) : isSub ? (
                        <div className="px-2 py-1 rounded-lg bg-blue-500 text-white text-[8px] font-black uppercase">Banc</div>
                      ) : null}
                    </button>
                  )
                })}
            </div>
          </div>
        </div>

        {/* Aperçu Pitch */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest px-2">
            Aperçu Tactique
          </h4>
          <div className="relative w-full mx-auto lg:mx-0">
            <PitchView
              players={teamLineup.filter(l => l.is_starter)}
              teamColor={teamColor}
              formation={currentFormation}
              className="aspect-3/4"
            />
            {updateLineup.isPending && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-4xl flex items-center justify-center z-20">
                <LoadingSpinner size="lg" />
              </div>
            )}
          </div>

          <Link
            to={`/matches/${nextMatch.slug || nextMatch.id}`}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white/2 border border-white/5 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-text-primary hover:bg-white/5 transition-all"
          >
            <ChevronRight size={14} />
            Détails du match complet
          </Link>
        </div>
      </div>

      {/* ── Historique des compositions ── */}
      {pastMatches.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <History size={13} className="text-text-muted" />
            <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest">
              Historique des compositions ({pastMatches.length})
            </h4>
          </div>

          <div className="glass-morphism rounded-3xl overflow-hidden border border-surface-border">
            {pastMatches.map((m, i) => {
              const isHome = m.home_team_id === teamId
              const opp = isHome ? m.away_team : m.home_team
              const myScore = isHome ? m.home_score : m.away_score
              const oppScore = isHome ? m.away_score : m.home_score
              const result: 'W' | 'D' | 'L' | null =
                myScore !== null && oppScore !== null
                  ? myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D'
                  : null

              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedHistoryMatch(m)}
                     className={clsx(
                       'w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-surface-raised transition-colors',
                       i < pastMatches.length - 1 && 'border-b border-surface-border'
                     )}
                >
                  {/* Résultat */}
                  <div className="shrink-0">
                    <ResultBadge result={result} variant="ghost" />
                  </div>

                  {/* Adversaire */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-black"
                      style={{ backgroundColor: opp.color }}
                    >
                      {opp.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-text-secondary uppercase tracking-tight truncate">
                        {isHome ? 'vs' : '@'} {opp.name}
                      </p>
                       <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">
                        J{m.matchday}
                        {m.played_at && (
                          <> · {new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(m.played_at))}</>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Score */}
                  {myScore !== null && oppScore !== null && (
                    <span className={clsx(
                      'text-sm font-black tabular-nums shrink-0',
                      result === 'W' ? 'text-green-400' : result === 'L' ? 'text-red-400' : 'text-text-secondary'
                    )}>
                      {myScore}–{oppScore}
                    </span>
                  )}

                  {/* Icône compo */}
                  <div className="shrink-0 flex items-center gap-1">
                     <ClipboardList size={13} className="text-text-muted" />
                     <ChevronRight size={13} className="text-text-muted" />
                  </div>
                </button>
              )
            })}
          </div>
         </div>
      )}

    </div>
  )
}
