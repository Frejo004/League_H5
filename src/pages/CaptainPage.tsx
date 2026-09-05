import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Crown, Users, Calendar, Target, MapPin, Pencil, Check, X as XIcon, ChevronRight, Zap, TrendingUp, Camera, Layout, UserCheck, History, ClipboardList, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { ResultBadge } from '@/components/ui/SharedBadges'
import { useAuth } from '@/hooks/useAuth'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useUpdateTeam } from '@/hooks/useTeams'
import { usePlayersByTeam } from '@/hooks/usePlayers'
import { useMyTeam } from '@/hooks/useMyTeam'
import { useTransfers } from '@/hooks/useTransfers'
import { supabase } from '@/lib/supabase'
import { useMatches } from '@/hooks/useMatches'
import { useScorers } from '@/hooks/useScorers'
import { useStandings } from '@/hooks/useStandings'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { FORMATIONS } from '@/components/matches/formations'
import { PitchView } from '@/components/matches/MatchLineups'
import { useMatchLineups, useUpdateMatchLineup } from '@/hooks/useLineups'
import type { TeamWithCaptain, Player } from '@/types/database'
import type { MatchWithTeams } from '@/hooks/useMatches'
import { pushLocal, useRealtimeTactics } from '@/hooks/useRealtime'
import { PlayerRow } from '@/components/captain/PlayerRow'
import { PlayerStatsDrawer } from '@/components/captain/PlayerStatsDrawer'
import { TransferStatusBadge } from '@/components/ui/StatusBadges'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Team, Transfer as TransferType } from '@/types/database'

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

// Type for transfers with joined data
type TransferWithRelations = TransferType & {
  player?: Player
  from_team?: Team
  to_team?: Team
}

function formatTime(dateStr: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === tomorrow.toDateString()) return 'Demain'
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short', day: 'numeric', month: 'short',
  }).format(d)
}


// ── Onglet Joueurs ────────────────────────────────────────────────────────────

function TabJoueurs({ teamId, teamColor, seasonId, readonly = false }: { teamId: string; teamColor: string; seasonId: string; readonly?: boolean }) {
  const { data: players, isLoading } = usePlayersByTeam(teamId)
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)

  if (isLoading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>

  const pending = (players ?? []).filter(p => !p.user_id)
  const linked = (players ?? []).filter(p => !!p.user_id)

  if (pending.length === 0 && linked.length === 0) {
    return (
      <Card className="p-0 overflow-hidden">
        <EmptyState
          icon={<Users />}
          title="Aucun joueur dans cette équipe"
          description="Invitez des joueurs pour commencer à construire votre équipe."
          className="py-6"
        />
      </Card>
    )
  }

  return (
    <>
      {/* Drawer stats joueur */}
      {selectedPlayer && (
        <PlayerStatsDrawer
          player={selectedPlayer}
          seasonId={seasonId}
          teamColor={teamColor}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      <div className="space-y-6">
        {/* Info — capitaine seulement */}
        {!readonly && (
          <Card className="p-4 bg-primary-500/5 border-primary-500/20">
            <p className="text-xs text-text-secondary leading-relaxed font-medium">
              <span className="text-primary-400 font-black">TIP :</span> Cliquez sur un joueur pour voir ses statistiques détaillées. Utilisez l'icône <Pencil size={10} className="inline mx-1" /> pour mettre à jour les numéros de maillot et les positions.
            </p>
          </Card>
        )}

        {/* Joueurs sans compte */}
        {pending.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="h-px flex-1 bg-linear-to-r from-transparent via-surface-border to-transparent" />
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                En attente ({pending.length})
              </p>
              <div className="h-px flex-1 bg-linear-to-r from-transparent via-surface-border to-transparent" />
            </div>
            <Card className="rounded-3xl overflow-hidden">
              {pending.map((p, i) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  isLast={i === pending.length - 1}
                  teamColor={teamColor}
                  onViewStats={setSelectedPlayer}
                  readonly={readonly}
                />
              ))}
            </Card>
          </div>
        )}

        {/* Joueurs avec compte */}
        {linked.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="h-px flex-1 bg-linear-to-r from-transparent via-surface-border to-transparent" />
              <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
                Comptes liés ({linked.length})
              </p>
              <div className="h-px flex-1 bg-linear-to-r from-transparent via-surface-border to-transparent" />
            </div>
            <Card className="rounded-3xl overflow-hidden">
              {linked.map((p, i) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  isLast={i === linked.length - 1}
                  teamColor={teamColor}
                  onViewStats={setSelectedPlayer}
                  readonly={readonly}
                />
              ))}
            </Card>
          </div>
        )}
      </div>
    </>
  )
}

// ── Onglet Matchs ─────────────────────────────────────────────────────────────

function MatchRow({ match, teamId }: { match: MatchWithTeams; teamId: string }) {
  const isCompleted = match.status === 'completed'
  const isCancelled = match.status === 'cancelled'
  const isHome = match.home_team_id === teamId
  const oppTeam = isHome ? match.away_team : match.home_team
  const myScore = isHome ? match.home_score : match.away_score
  const oppScore = isHome ? match.away_score : match.home_score

  let result: 'W' | 'D' | 'L' | null = null
  if (isCompleted && myScore !== null && oppScore !== null) {
    result = myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D'
  }

  return (
    <Link
      to={`/matches/${match.slug || match.id}`}
      className="flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-all border-b border-white/3 last:border-b-0 group"
    >
      {/* Résultat badge */}
      <div className="shrink-0">
        <ResultBadge result={result} variant="ghost" />
      </div>

      {/* Adversaire */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white text-xs font-black shadow-lg"
          style={{ backgroundColor: oppTeam.color }}
        >
          {oppTeam.name[0]}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-200 uppercase tracking-tight group-hover:text-white transition-colors">
            {isHome ? 'vs' : '@'} {oppTeam.name}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
            <span className="bg-white/5 px-1.5 py-0.5 rounded text-slate-400">J{match.matchday}</span>
            {match.venue && (
              <span className="flex items-center gap-1">
                <MapPin size={10} className="text-slate-600" />
                <span className="truncate max-w-20">{match.venue}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Score ou date */}
      <div className="shrink-0 text-right">
        {isCompleted ? (
          <div className="flex flex-col items-end">
            <span className={clsx(
              'text-lg font-black tabular-nums tracking-tighter',
              result === 'W' ? 'text-green-400' : result === 'L' ? 'text-red-400' : 'text-slate-300'
            )}>
              {myScore} – {oppScore}
            </span>
          </div>
        ) : isCancelled ? (
          <span className="text-[10px] text-red-500 font-black uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20">Annulé</span>
        ) : match.scheduled_at ? (
          <div className="space-y-0.5">
            <p className="text-sm font-black text-white tabular-nums">{formatTime(match.scheduled_at)}</p>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{formatDate(match.scheduled_at)}</p>
          </div>
        ) : (
          <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">À venir</span>
        )}
      </div>
    </Link>
  )
}

function TabMatchs({ teamId, seasonId }: { teamId: string; seasonId: string }) {
  const { data: matches, isLoading } = useMatches(seasonId)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')

  if (isLoading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>

  const teamMatches = (matches ?? []).filter(
    m => m.home_team_id === teamId || m.away_team_id === teamId
  )

  const filtered = teamMatches.filter(m => {
    if (filter === 'upcoming') return m.status === 'scheduled'
    if (filter === 'past') return m.status === 'completed'
    return true
  })

  const upcoming = teamMatches.filter(m => m.status === 'scheduled').length
  const played = teamMatches.filter(m => m.status === 'completed').length

  return (
    <div className="space-y-6">
      {/* Résumé rapide premium */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Joués', value: played, color: 'text-white', icon: Check },
          { label: 'À venir', value: upcoming, color: 'text-blue-400', icon: Calendar },
          { label: 'Total', value: teamMatches.length, color: 'text-slate-500', icon: TrendingUp },
        ].map(s => (
          <div key={s.label} className="glass-morphism p-4 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="relative z-10">
              <p className={clsx('text-2xl font-black tabular-nums', s.color)}>{s.value}</p>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">{s.label}</p>
            </div>
            <s.icon size={40} className="absolute -bottom-2 -right-2 text-white/3 group-hover:text-white/10 transition-colors" />
          </div>
        ))}
      </div>

      {/* Filtres & Liste */}
      <div className="glass-morphism rounded-3xl overflow-hidden border border-surface-border">
        <div className="flex p-1 bg-black/20 border-b border-surface-border">
          {(['all', 'upcoming', 'past'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'relative flex-1 py-2.5 rounded-xl transition-all duration-300 text-[10px] font-black uppercase tracking-widest',
                filter === f ? 'text-white' : 'text-slate-500 hover:text-slate-400'
              )}
            >
              {filter === f && (
                <motion.div layoutId="matchFilterBg" className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl" />
              )}
              <span className="relative z-10">
                {f === 'all' ? 'Tous' : f === 'upcoming' ? 'À venir' : 'Passés'}
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card className="p-0 overflow-hidden">
            <EmptyState
              icon={<Calendar />}
              title="Aucun match trouvé"
              description="Modifiez vos filtres ou revenez plus tard."
              className="py-12"
            />
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-surface-border">
              {filtered.map(m => (
                <MatchRow key={m.id} match={m} teamId={teamId} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

// ── Drawer historique compo d'un match passé ─────────────────────────────────

function LineupHistoryDrawer({
  match,
  teamId,
  teamColor,
  onClose,
}: {
  match: MatchWithTeams
  teamId: string
  teamColor: string
  onClose: () => void
}) {
  const { data: lineups, isLoading } = useMatchLineups(match.id)

  const teamLineup = useMemo(() => {
    return (lineups ?? []).filter(l => l.team_id === teamId)
  }, [lineups, teamId])

  const starters = teamLineup.filter(l => l.is_starter)
  const subs = teamLineup.filter(l => !l.is_starter)

  const formation = useMemo(() => {
    const firstPos = starters.find(l => l.position?.includes(':'))?.position
    return firstPos?.split(':')[0] || '2-1-1'
  }, [starters])

  const isHome = match.home_team_id === teamId
  const opp = isHome ? match.away_team : match.home_team
  const myScore = isHome ? match.home_score : match.away_score
  const oppScore = isHome ? match.away_score : match.home_score
  const result: 'W' | 'D' | 'L' | null =
    myScore !== null && oppScore !== null
      ? myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D'
      : null

  // Ferme avec Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Bloque le scroll body
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div
        className="relative w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden animate-fade-in-up"
        style={{ backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-surface-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--color-surface-border)' }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-black text-primary-500 uppercase tracking-widest">J{match.matchday}</span>
              <p className="text-sm font-black text-white truncate">
                {isHome ? 'vs' : '@'} {opp.name}
              </p>
              {result && (
                <span className={clsx(
                  'text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider',
                  result === 'W' ? 'bg-green-500/20 text-green-400' :
                    result === 'L' ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-500/20 text-slate-400'
                )}>
                  {myScore}–{oppScore}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {match.played_at
                ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }).format(new Date(match.played_at))
                : '—'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors shrink-0"
            aria-label="Fermer"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : teamLineup.length === 0 ? (
            <Card className="p-0 overflow-hidden">
              <EmptyState
                icon={<ClipboardList />}
                title="Aucune composition"
                description="Aucune compo n'a été soumise pour ce match."
                className="py-12"
              />
            </Card>
          ) : (
            <>
              {/* Formation + pitch */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Formation · {formation}
                  </p>
                  <span className="text-[10px] font-black text-slate-400 bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                    {starters.length} titulaires · {subs.length} remplaçants
                  </span>
                </div>
                <PitchView
                  players={starters}
                  teamColor={teamColor}
                  formation={formation}
                  className="aspect-3/4 max-h-64"
                />
              </div>

              {/* Liste titulaires */}
              {starters.length > 0 && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="flex items-center gap-1.5 px-3 py-2"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <UserCheck size={12} className="text-primary-400" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Titulaires ({starters.length})
                    </p>
                  </div>
                  {starters.map((l, i) => (
                    <div
                      key={l.id}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2.5',
                        i < starters.length - 1 && 'border-b border-white/4'
                      )}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0"
                        style={{ backgroundColor: teamColor }}
                      >
                        {l.jersey_number ?? '—'}
                      </div>
                      <p className="text-sm text-white font-medium flex-1 truncate">
                        {l.player ? `${l.player.first_name} ${l.player.last_name}` : '—'}
                      </p>
                      {l.position && (
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider shrink-0">
                          {l.position.includes(':') ? l.position.split(':')[1] : l.position}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Liste remplaçants */}
              {subs.length > 0 && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="flex items-center gap-1.5 px-3 py-2"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <Users size={12} className="text-blue-400" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">
                      Remplaçants ({subs.length})
                    </p>
                  </div>
                  {subs.map((l, i) => (
                    <div
                      key={l.id}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2.5',
                        i < subs.length - 1 && 'border-b border-white/4'
                      )}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0 opacity-60"
                        style={{ backgroundColor: teamColor }}
                      >
                        {l.jersey_number ?? '—'}
                      </div>
                      <p className="text-sm text-slate-400 font-medium flex-1 truncate">
                        {l.player ? `${l.player.first_name} ${l.player.last_name}` : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Lien vers le match */}
              <Link
                to={`/matches/${match.slug || match.id}`}
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/3 border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all"
              >
                <ChevronRight size={13} />
                Voir le match complet
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Onglet Tactique ──────────────────────────────────────────────────────────

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

  // Broadcast tactical updates to other players
  const broadcastUpdate = useCallback((type: BroadcastType, data: Omit<BroadcastData, 'type' | 'teamId' | 'captainName'>) => {
    if (!nextMatch) return
    // Unification du canal tactique au niveau du match
    const channel = supabase.channel(`tactics-match-${nextMatch.id}`)
    channel.send({
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
          <h3 className="text-base font-black text-white uppercase tracking-tight">
            {nextMatch.home_team.name} <span className="text-slate-500 mx-1">vs</span> {nextMatch.away_team.name}
          </h3>
        </div>
        <div className="text-center md:text-right">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
            {formatDate(nextMatch.scheduled_at!)} · {formatTime(nextMatch.scheduled_at!)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        <div className="space-y-8">
          {/* Sélecteur de Tactique */}
          <div className="space-y-4">
            <div className="px-2">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
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
                        : "glass-morphism border-white/5 text-slate-500 hover:bg-white/5",
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
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <UserCheck size={12} className="text-primary-500" />
                2. Fiche de Match (5 Majeur)
              </h4>
              <span className="text-[10px] font-black text-slate-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
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
                        <p className={clsx("text-xs font-bold truncate", (isStarter || isSub) ? "text-white" : "text-slate-400")}>
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
          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">
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
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white/2 border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all"
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
            <History size={13} className="text-slate-500" />
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
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
                      <p className="text-sm font-black text-slate-200 uppercase tracking-tight truncate">
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
                      result === 'W' ? 'text-green-400' : result === 'L' ? 'text-red-400' : 'text-slate-300'
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

// ── Onglet Stats ──────────────────────────────────────────────────────────────

function TabTransferts({ teamId }: { teamId: string }) {
  const { data: transfers, isLoading, approveAsHomeCaptain, approveAsAwayCaptain, rejectTransfer } = useTransfers(teamId)

  if (isLoading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>

  // Split transfers into outgoing (from our team) and incoming (to our team)
  const outgoingTransfers = (transfers as unknown as TransferWithRelations[] ?? []).filter(t => t.from_team_id === teamId)
  const incomingTransfers = (transfers as unknown as TransferWithRelations[] ?? []).filter(t => t.to_team_id === teamId)

  return (
    <div className="space-y-6">
      {/* Outgoing Transfers (from our team) */}
            {outgoingTransfers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="h-px flex-1 bg-linear-to-r from-transparent via-red-500/30 to-transparent" />
                  <p className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em]">
                    DEMANDES SORTANTES ({outgoingTransfers.length})
                  </p>
                  <div className="h-px flex-1 bg-linear-to-r from-transparent via-red-500/30 to-transparent" />
                </div>
                <Card className="rounded-3xl overflow-hidden">
            {outgoingTransfers.map((transfer, i) => (
              <div
                key={transfer.id}
                className={clsx(
                  'p-4 flex flex-col gap-3',
                  i < outgoingTransfers.length - 1 && 'border-b border-surface-border'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                      style={{ backgroundColor: transfer.from_team?.color || '#6b7280' }}>
                      {transfer.player?.first_name?.[0]}{transfer.player?.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white uppercase tracking-tight truncate">
                        {transfer.player?.first_name} {transfer.player?.last_name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {transfer.from_team?.name} → {transfer.to_team?.name}
                      </p>
                      {transfer.reason && (
                        <p className="text-xs text-slate-400 mt-1 italic">"{transfer.reason}"</p>
                      )}
                    </div>
                  </div>
                  <TransferStatusBadge status={transfer.status} />
                </div>

                {transfer.status === 'player_requested' && (
                  <div className="flex gap-2 justify-end">
                     <button
                       onClick={() => rejectTransfer.mutate(transfer.id)}
                       disabled={rejectTransfer.isPending}
                       className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                     >
                       Refuser
                     </button>
                     <Button
                       size="sm"
                       onClick={() => approveAsHomeCaptain.mutate(transfer.id)}
                       disabled={approveAsHomeCaptain.isPending}
                       loading={approveAsHomeCaptain.isPending ? 'Approbation…' : undefined}
                     >
                       Approuver
                     </Button>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Incoming Transfers (to our team) */}
            {incomingTransfers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-2">
                  <div className="h-px flex-1 bg-linear-to-r from-transparent via-emerald-500/30 to-transparent" />
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">
                    DEMANDES ENTRANTES ({incomingTransfers.length})
                  </p>
                  <div className="h-px flex-1 bg-linear-to-r from-transparent via-emerald-500/30 to-transparent" />
                </div>
                <Card className="rounded-3xl overflow-hidden">
            {incomingTransfers.map((transfer, i) => (
              <div
                key={transfer.id}
                className={clsx(
                  'p-4 flex flex-col gap-3',
                  i < incomingTransfers.length - 1 && 'border-b border-surface-border'
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                      style={{ backgroundColor: transfer.from_team?.color || '#6b7280' }}>
                      {transfer.player?.first_name?.[0]}{transfer.player?.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white uppercase tracking-tight truncate">
                        {transfer.player?.first_name} {transfer.player?.last_name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {transfer.from_team?.name} → {transfer.to_team?.name}
                      </p>
                      {transfer.reason && (
                        <p className="text-xs text-slate-400 mt-1 italic">"{transfer.reason}"</p>
                      )}
                    </div>
                  </div>
                  <TransferStatusBadge status={transfer.status} />
                </div>

                {transfer.status === 'admin_approved' && (
                  <div className="flex gap-2 justify-end">
                     <button
                       onClick={() => rejectTransfer.mutate(transfer.id)}
                       disabled={rejectTransfer.isPending}
                       className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                     >
                       Refuser
                     </button>
                     <Button
                       size="sm"
                       onClick={() => approveAsAwayCaptain.mutate(transfer.id)}
                       disabled={approveAsAwayCaptain.isPending}
                       loading={approveAsAwayCaptain.isPending ? 'Finalisation…' : undefined}
                     >
                       Finaliser le transfert
                     </Button>
                  </div>
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      {outgoingTransfers.length === 0 && incomingTransfers.length === 0 && (
        <Card className="p-0 overflow-hidden">
          <EmptyState
            icon={<Send size={20} />}
            title="Aucune demande de transfert"
            className="py-10"
          />
        </Card>
      )}
    </div>
  )
}

function TabStats({ teamId, seasonId }: { teamId: string; seasonId: string }) {
  const { data: scorers, isLoading } = useScorers(seasonId)

  if (isLoading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>

  const teamScorers = (scorers ?? [])
    .filter(s => s.team_id === teamId && (s.goals > 0 || s.assists > 0))
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)

  if (teamScorers.length === 0) {
    return (
      <Card className="p-0 overflow-hidden">
        <EmptyState
          icon={<Target size={20} />}
          title="Aucune statistique"
          description="Disponible après les premiers matchs."
          className="py-10"
        />
      </Card>
    )
  }

  const totalGoals = teamScorers.reduce((s, r) => s + r.goals, 0)
  const totalAssists = teamScorers.reduce((s, r) => s + r.assists, 0)

  return (
    <div className="space-y-6">
      {/* Totaux équipe premium */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-5 relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-3xl font-black text-orange-400 tabular-nums">{totalGoals}</p>
            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-1">Buts marqués</p>
          </div>
          <Target size={60} className="absolute -bottom-4 -right-4 text-orange-500/5 group-hover:text-orange-500/10 transition-colors" />
        </Card>
        <Card className="p-5 relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-3xl font-black text-blue-400 tabular-nums">{totalAssists}</p>
            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-1">Passes décisives</p>
          </div>
          <Zap size={60} className="absolute -bottom-4 -right-4 text-blue-500/5 group-hover:text-blue-500/10 transition-colors" />
        </Card>
      </div>

      {/* Tableau buteurs premium */}
      <Card className="rounded-3xl overflow-hidden">
        <div className="grid grid-cols-[3rem_1fr_4rem_4rem] gap-2 px-6 py-4 bg-surface-raised border-b border-surface-border">
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">#</span>
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Joueur</span>
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest text-center">Buts</span>
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest text-center">Passes</span>
        </div>

        <div className="divide-y divide-surface-border">
          {teamScorers.map((row, i) => (
            <div
              key={row.player_id}
              className="grid grid-cols-[3rem_1fr_4rem_4rem] gap-2 items-center px-6 py-4 hover:bg-white/5 transition-colors group"
            >
              <span className={clsx(
                'text-xs font-black tabular-nums text-center',
                i === 0 ? 'text-amber-400' : i === 1 ? 'text-text-secondary' : i === 2 ? 'text-amber-700' : 'text-text-muted'
              )}>
                {i + 1}
              </span>

              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-lg transition-transform group-hover:scale-110"
                  style={{ backgroundColor: row.team_color }}
                >
                  {row.first_name[0]}{row.last_name[0]}
                </div>
                <p className="text-sm font-black text-text-secondary uppercase tracking-tight truncate group-hover:text-white">
                  {row.first_name} {row.last_name}
                </p>
              </div>

              <span className={clsx(
                'text-lg font-black tabular-nums text-center tracking-tighter',
                i === 0 ? 'text-orange-400' : 'text-white'
              )}>
                {row.goals}
              </span>

              <span className="text-sm font-bold text-text-muted tabular-nums text-center group-hover:text-primary-400 transition-colors">
                {row.assists || '—'}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ── Contenu équipe partagé (capitaine + joueur) ───────────────────────────────

export function TeamView({
  teamId,
  teamColor,
  seasonId,
  readonly = false
}: {
  teamId: string
  teamColor: string
  seasonId: string
  readonly?: boolean
}) {
  const [activeTab, setActiveTab] = useState<Tab>('joueurs')

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Tab bar premium */}
      <div className="flex p-1 bg-black/40 backdrop-blur-md rounded-2xl border border-surface-border">
        {TABS.filter(t => !readonly || t.id !== 'tactique').map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={clsx(
              'relative flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all duration-300',
              activeTab === id ? 'text-white' : 'text-slate-500 hover:text-slate-400'
            )}
          >
            {activeTab === id && (
              <motion.div
                layoutId="activeTabBackground"
                className="absolute inset-0 bg-surface-raised border border-surface-border rounded-xl"
              />
            )}
            <Icon size={16} className="relative z-10" />
            <span className="relative z-10 text-[10px] font-black uppercase tracking-widest">{label}</span>
          </button>
        ))}
      </div>

      {/* Contenu onglet */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'joueurs' && (
          <TabJoueurs teamId={teamId} teamColor={teamColor} seasonId={seasonId} readonly={readonly} />
        )}
        {activeTab === 'matchs' && (
          <TabMatchs teamId={teamId} seasonId={seasonId} />
        )}
        {activeTab === 'stats' && (
          <TabStats teamId={teamId} seasonId={seasonId} />
        )}
        {activeTab === 'tactique' && (
          <TabTactique teamId={teamId} seasonId={seasonId} teamColor={teamColor} readonly={readonly} />
        )}
        {activeTab === 'transferts' && (
          <TabTransferts teamId={teamId} />
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Page principale capitaine ─────────────────────────────────────────────────

type Tab = 'joueurs' | 'matchs' | 'stats' | 'tactique' | 'transferts'

const TABS: { id: Tab; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { id: 'joueurs', label: 'Joueurs', icon: Users },
  { id: 'matchs', label: 'Matchs', icon: Calendar },
  { id: 'tactique', label: 'Tactique', icon: Layout },
  { id: 'stats', label: 'Stats', icon: Target },
  { id: 'transferts', label: 'Transferts', icon: Send },
]

export function CaptainPage() {
  const { isCaptain } = useAuth()
  const { data: season } = useActiveSeason()
  // useMyTeam charge uniquement le joueur + l'équipe du capitaine connecté,
  // sans charger toute la liste des joueurs de la saison.
  const { myTeam, isLoading: teamLoading } = useMyTeam(season?.id)
  const { data: standings } = useStandings(season?.id)

  // Édition nom d'équipe
  const updateTeam = useUpdateTeam()
  const [editingName, setEditingName] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [nameError, setNameError] = useState('')

  // Upload logo équipe
  const logoRef = useRef<HTMLInputElement>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')

  if (!isCaptain) return <Navigate to="/dashboard" replace />

  // Caste vers TeamWithCaptain pour accéder aux champs étendus
  const myTeamTyped = myTeam as unknown as TeamWithCaptain | null

  function startEditName() {
    setTeamName(myTeamTyped?.name ?? '')
    setNameError('')
    setEditingName(true)
  }

  function cancelEditName() {
    setEditingName(false)
    setNameError('')
  }

  async function saveTeamName() {
    const trimmed = teamName.trim()
    if (!trimmed) { setNameError('Le nom ne peut pas être vide'); return }
    if (!myTeamTyped) return
    setNameError('')
    try {
      await updateTeam.mutateAsync({ id: myTeamTyped.id, name: trimmed, season_id: myTeamTyped.season_id })
      setEditingName(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setNameError(msg.includes('unique') ? 'Ce nom est déjà pris' : 'Erreur, réessaie')
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !myTeamTyped) return
    if (file.size > 2 * 1024 * 1024) { setLogoError('Max 2 Mo.'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setLogoError('Format : JPG, PNG ou WebP.'); return
    }
    setLogoError('')
    setLogoUploading(true)
    try {
      const path = `teams/${myTeamTyped.id}/logo`

      // Upsert direct : crée ou remplace le fichier existant
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true })
      if (uploadErr) throw uploadErr

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const logoUrlWithBust = `${data.publicUrl}?t=${Date.now()}`
      await updateTeam.mutateAsync({
        id: myTeamTyped.id,
        logo_url: logoUrlWithBust,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur upload'
      setLogoError(msg.includes('row-level') || msg.includes('policy')
        ? 'Permission refusée.'
        : 'Erreur upload, réessaie.')
    } finally {
      setLogoUploading(false)
      if (logoRef.current) logoRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Crown size={18} className="text-amber-400" />
        <h1 className="page-title">Mon Équipe</h1>
      </div>

      {!season || teamLoading ? (
        <Card className="p-0 overflow-hidden">
          <div className="empty-state py-6">
            {teamLoading
              ? <LoadingSpinner />
              : <p className="text-text-secondary text-sm">Aucune saison active.</p>
            }
          </div>
        </Card>
      ) : !myTeamTyped ? (
        <Card className="p-0 overflow-hidden">
          <EmptyState
            icon={<Crown size={20} />}
            title="Aucune équipe assignée"
            description="L'administrateur doit vous assigner comme capitaine d'une équipe."
            className="py-8"
          />
        </Card>
      ) : (
        <>
          {/* Premium Team Hero */}
          <Card className="relative overflow-hidden rounded-4xl border-primary-500/20 shadow-glow mb-6">
            {/* Background Mesh/Glow */}
            <div
              className="absolute inset-0 opacity-20 blur-3xl -z-10"
              style={{ backgroundColor: myTeamTyped.color ?? '#8b5cf6' }}
            />
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 p-8">
              {/* Logo Section */}
              <div className="relative group">
                <div
                  className="w-24 h-24 rounded-3xl flex items-center justify-center text-white font-black text-4xl overflow-hidden shadow-2xl transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundColor: myTeamTyped.color ?? '#16a34a' }}
                >
                  {myTeamTyped.logo_url
                    ? <img src={myTeamTyped.logo_url} alt="" className="w-full h-full object-cover" />
                    : myTeamTyped.name[0]
                  }
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={24} className="text-white animate-pulse" />
                  </div>
                </div>

                {/* Hidden Input & Button trigger */}
                 <button
                   onClick={() => logoRef.current?.click()}
                   disabled={logoUploading}
                   className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-primary-600 hover:bg-primary-500
                                border-4 border-surface flex items-center justify-center transition-all shadow-xl
                                hover:scale-110 active:scale-95 disabled:opacity-50"
                 >
                  {logoUploading ? <LoadingSpinner size="sm" /> : <Pencil size={12} className="text-white" />}
                </button>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>

              {/* Info Section */}
              <div className="flex-1 text-center md:text-left space-y-2">
                 <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                   <Badge variant="info" dot>
                     <Crown size={10} />
                     Capitaine
                   </Badge>
                   <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-text-muted">
                     {season.name}
                   </span>
                 </div>

                {editingName ? (
                  <div className="space-y-2">
                    <input
                      autoFocus
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveTeamName(); if (e.key === 'Escape') cancelEditName() }}
                      className="w-full max-w-md px-4 py-3 rounded-2xl bg-black/40 border border-primary-500
                                     text-white text-2xl font-black focus:outline-none shadow-inner"
                      maxLength={40}
                    />
                     <div className="flex gap-2">
                       <Button size="sm" onClick={saveTeamName} loading={updateTeam.isPending ? 'Sauvegarde…' : undefined}>Sauver</Button>
                       <Button size="sm" variant="secondary" onClick={cancelEditName}>Annuler</Button>
                     </div>
                    {nameError && <p className="text-[10px] text-red-400 mt-1">{nameError}</p>}
                  </div>
                ) : (
                  <div className="group flex items-center justify-center md:justify-start gap-3">
                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter truncate">
                      {myTeamTyped.name}
                    </h1>
                    <button
                      onClick={startEditName}
                      className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Pencil size={18} />
                    </button>
                  </div>
                )}
                {logoError && <p className="text-xs text-red-400 font-bold">{logoError}</p>}
              </div>

              {/* Quick Stats Summary */}
              {myTeamTyped && standings && (
                <div className="hidden lg:flex gap-8 px-8 py-4 rounded-3xl bg-surface-raised border border-surface-border">
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">
                      #{standings.findIndex(s => s.team_id === myTeamTyped.id) + 1 || '—'}
                    </p>
                    <p className="text-[9px] text-text-muted font-black uppercase tracking-[0.2em]">Rang</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">
                      {standings.find(s => s.team_id === myTeamTyped.id)?.points ?? 0}
                    </p>
                    <p className="text-[9px] text-text-muted font-black uppercase tracking-[0.2em]">Points</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">
                      {standings.find(s => s.team_id === myTeamTyped.id)?.played ?? 0}
                    </p>
                    <p className="text-[9px] text-text-muted font-black uppercase tracking-[0.2em]">Matchs</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Onglets */}
          <TeamView
            teamId={myTeamTyped.id}
            teamColor={myTeamTyped.color ?? '#16a34a'}
            seasonId={season.id}
          />
        </>
      )}
    </div>
  )
}
