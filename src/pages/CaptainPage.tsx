import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Crown, Users, Calendar, Target, MapPin, Pencil, Check, X as XIcon, ChevronRight, Zap, Star, BarChart2, TrendingUp, Camera, Layout, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { POSITION_LABELS, ResultBadge } from '@/components/ui/SharedBadges'
import { useAuth } from '@/hooks/useAuth'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTeams, useUpdateTeam } from '@/hooks/useTeams'
import { usePlayersByTeam, usePlayers, useUpdatePlayer } from '@/hooks/usePlayers'
import { supabase } from '@/lib/supabase'
import { useMatches } from '@/hooks/useMatches'
import { useScorers } from '@/hooks/useScorers'
import { usePlayerProfile } from '@/hooks/usePlayerProfile'
import { usePlayerMvp } from '@/hooks/useMvpVotes'
import { useStandings } from '@/hooks/useStandings'
import { InviteButton } from '@/components/ui/InviteButton'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { MatchLineups, FORMATIONS, PitchView } from '@/components/matches/MatchLineups'
import { useMatchLineups, useUpdateMatchLineup } from '@/hooks/useLineups'
import type { TeamWithCaptain, Player, PlayerPosition } from '@/types/database'
import type { MatchWithTeams } from '@/hooks/useMatches'
import { pushLocal, useRealtimeTactics } from '@/hooks/useRealtime'

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function positionLabel(pos: PlayerPosition | null) {
  return pos ? POSITION_LABELS[pos] : '—'
}

// ── Ligne joueur éditable ─────────────────────────────────────────────────────

function PlayerRow({
  player,
  isLast,
  teamColor,
  onViewStats,
  readonly = false,
}: {
  player: Player
  isLast: boolean
  teamColor: string
  onViewStats: (p: Player) => void
  readonly?: boolean
}) {
  const updatePlayer = useUpdatePlayer()
  const [editing, setEditing] = useState(false)
  const [jersey, setJersey] = useState(player.jersey_number?.toString() ?? '')
  const [position, setPosition] = useState<PlayerPosition | ''>(player.position ?? '')
  const [error, setError] = useState('')

  function handleCancel() {
    setJersey(player.jersey_number?.toString() ?? '')
    setPosition(player.position ?? '')
    setError('')
    setEditing(false)
  }

  async function handleSave() {
    setError('')
    const jerseyNum = jersey === '' ? null : parseInt(jersey, 10)
    if (jersey !== '' && (isNaN(jerseyNum!) || jerseyNum! < 1 || jerseyNum! > 99)) {
      setError('Numéro entre 1 et 99')
      return
    }
    try {
      await updatePlayer.mutateAsync({
        id: player.id,
        jersey_number: jerseyNum,
        position: (position as PlayerPosition) || null,
      })
      setEditing(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('unique') ? 'Ce numéro est déjà pris' : 'Erreur, réessaie')
    }
  }

  return (
    <div className={clsx(!isLast && 'border-b border-surface-border/50')}>
      {/* Ligne principale */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        {/* Avatar cliquable → stats */}
        <button
          onClick={() => onViewStats(player)}
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 hover:ring-2 hover:ring-white/30 transition-all"
          style={{ backgroundColor: teamColor }}
          title="Voir les stats"
          aria-label={`Stats de ${player.first_name} ${player.last_name}`}
        >
          {player.first_name[0]}{player.last_name[0]}
        </button>

        {/* Nom + meta — cliquable aussi */}
        <button
          onClick={() => onViewStats(player)}
          className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <p className="text-sm font-medium text-white truncate">
            {player.first_name} {player.last_name}
          </p>
          {!editing && (
            <p className="text-[10px] text-slate-500">
              {player.jersey_number ? `#${player.jersey_number}` : 'Sans numéro'}
              {' · '}
              {positionLabel(player.position)}
            </p>
          )}
        </button>

        {/* Actions droite */}
        <div className="flex items-center gap-1 shrink-0">
          {!editing && (
            <>
              {/* Voir stats */}
              <button
                onClick={() => onViewStats(player)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                title="Voir les statistiques"
                aria-label="Voir les statistiques"
              >
                <ChevronRight size={14} />
              </button>
              {/* Modifier — capitaine seulement */}
              {!readonly && (
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-surface-raised transition-colors"
                  title="Modifier"
                  aria-label="Modifier le joueur"
                >
                  <Pencil size={13} />
                </button>
              )}
              {!readonly && (
                <InviteButton
                  playerId={player.id}
                  playerName={`${player.first_name} ${player.last_name}`}
                  hasAccount={!!player.user_id}
                />
              )}
            </>
          )}
          {editing && (
            <>
              <button
                onClick={handleSave}
                disabled={updatePlayer.isPending}
                className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                title="Enregistrer"
                aria-label="Enregistrer"
              >
                {updatePlayer.isPending ? <LoadingSpinner size="sm" /> : <Check size={14} />}
              </button>
              <button
                onClick={handleCancel}
                disabled={updatePlayer.isPending}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Annuler"
                aria-label="Annuler"
              >
                <XIcon size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Formulaire inline — capitaine seulement */}
      {editing && !readonly && (
        <div className="px-4 pb-3 flex items-center gap-2">
          {/* Numéro */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Numéro</label>
            <input
              type="number"
              min={1}
              max={99}
              value={jersey}
              onChange={e => setJersey(e.target.value)}
              placeholder="—"
              className="w-16 px-2 py-1.5 rounded-lg bg-surface-raised border border-surface-border
                         text-white text-sm text-center focus:outline-none focus:border-primary-500
                         [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                         [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Position */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Position</label>
            <select
              value={position}
              onChange={e => setPosition(e.target.value as PlayerPosition | '')}
              className="w-full px-2 py-1.5 rounded-lg bg-surface-raised border border-surface-border
                         text-white text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">— Non définie —</option>
              {Object.entries(POSITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Erreur */}
          {error && (
            <p className="text-[10px] text-red-400 mt-4 shrink-0">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Drawer stats joueur ───────────────────────────────────────────────────────

function formatShortDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(new Date(dateStr))
}


function PlayerStatsDrawer({
  player,
  seasonId,
  teamColor,
  onClose,
}: {
  player: Player
  seasonId: string
  teamColor: string
  onClose: () => void
}) {
  const { data: profile, isLoading } = usePlayerProfile(player.id)
  const { data: mvpData } = usePlayerMvp(player.id, seasonId)

  // Ferme avec Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Bloque le scroll body
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Calcul évolution cumulative buts+passes match par match (ordre chronologique)
  const chronoMatches = profile ? [...profile.recent_matches].reverse() : []
  let cumGoals = 0
  let cumAssists = 0
  const evolution = chronoMatches.map(m => {
    cumGoals += m.goals_in_match
    cumAssists += m.assists_in_match
    return { matchday: m.matchday, goals: cumGoals, assists: cumAssists, result: m.result }
  })
  const maxVal = Math.max(...evolution.map(e => e.goals), 1)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative w-full sm:max-w-lg max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden animate-fade-in-up"
        style={{ backgroundColor: '#161B22', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ backgroundColor: teamColor }}
          >
            {player.first_name[0]}{player.last_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white truncate">
              {player.first_name} {player.last_name}
            </p>
            <p className="text-xs text-slate-500">
              {player.jersey_number ? `#${player.jersey_number} · ` : ''}
              {positionLabel(player.position)}
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
          ) : !profile ? (
            <p className="text-slate-500 text-sm text-center py-8">Données indisponibles.</p>
          ) : (
            <>
              {/* ── Stats saison ── */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Matchs', value: profile.matches_played, icon: Calendar, color: 'text-blue-400' },
                  { label: 'Buts', value: profile.goals, icon: Target, color: 'text-orange-400' },
                  { label: 'Passes', value: profile.assists, icon: Zap, color: 'text-violet-400' },
                  { label: 'MVP', value: mvpData?.total_mvp ?? 0, icon: Star, color: 'text-amber-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div
                    key={label}
                    className="rounded-xl p-2.5 text-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <Icon size={14} className={clsx('mx-auto mb-1', color)} />
                    <p className="text-xl font-bold text-white tabular-nums">{value}</p>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* ── Évolution cumulative ── */}
              {evolution.length > 1 && (
                <div
                  className="rounded-xl p-3"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-1.5 mb-3">
                    <TrendingUp size={13} className="text-slate-400" />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Évolution saison</p>
                  </div>

                  {/* Graphique barres buts cumulés */}
                  <div className="flex items-end gap-1 h-16">
                    {evolution.map((e, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div className="w-full flex flex-col justify-end" style={{ height: 52 }}>
                          <div
                            className={clsx(
                              'w-full rounded-sm transition-all',
                              e.result === 'W' ? 'bg-green-500/70' : e.result === 'L' ? 'bg-red-500/70' : 'bg-slate-500/70'
                            )}
                            style={{ height: `${Math.max(4, (e.goals / maxVal) * 52)}px` }}
                          />
                        </div>
                        <span className="text-[8px] text-slate-600">J{e.matchday}</span>
                      </div>
                    ))}
                  </div>

                  {/* Légende */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-orange-400/70" />
                      <span className="text-[10px] text-slate-500">Buts cumulés</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-green-500/70" />
                      <span className="text-[10px] text-slate-500">Victoire</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm bg-red-500/70" />
                      <span className="text-[10px] text-slate-500">Défaite</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Derniers matchs ── */}
              {profile.recent_matches.length > 0 ? (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="flex items-center gap-1.5 px-3 py-2"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <BarChart2 size={13} className="text-slate-400" />
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Matchs joués ({profile.recent_matches.length})
                    </p>
                  </div>

                  {/* Colonnes header */}
                  <div className="grid grid-cols-[3rem_1fr_2rem_2rem_2rem] gap-1 px-3 py-1.5"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span className="text-[9px] text-slate-600 uppercase tracking-wider">Date</span>
                    <span className="text-[9px] text-slate-600 uppercase tracking-wider">Match</span>
                    <span className="text-[9px] text-slate-600 uppercase tracking-wider text-center">Rés</span>
                    <span className="text-[9px] text-orange-400/60 uppercase tracking-wider text-center">⚽</span>
                    <span className="text-[9px] text-violet-400/60 uppercase tracking-wider text-center">🅰</span>
                  </div>

                  {profile.recent_matches.map((m, i) => {
                    const isHome = m.home_team.id === profile.team_id
                    const opp = isHome ? m.away_team : m.home_team
                    const myScore = isHome ? m.home_score : m.away_score
                    const opScore = isHome ? m.away_score : m.home_score

                    return (
                      <Link
                        key={m.match_id}
                        to={`/matches/${m.match_id}`}
                        onClick={onClose}
                        className={clsx(
                          'grid grid-cols-[3rem_1fr_2rem_2rem_2rem] gap-1 items-center px-3 py-2',
                          'hover:bg-white/5 transition-colors',
                          i < profile.recent_matches.length - 1 && 'border-b border-white/[0.04]'
                        )}
                      >
                        <span className="text-[10px] text-slate-600 tabular-nums">
                          {formatShortDate(m.played_at)}
                        </span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: opp.color }} />
                          <span className="text-xs text-slate-300 truncate">{opp.name}</span>
                          <span className="text-[10px] text-slate-600 shrink-0 tabular-nums">
                            {myScore}–{opScore}
                          </span>
                        </div>
                        <div className="flex justify-center">
                          <ResultBadge result={m.result} />
                        </div>
                        <div className="text-center">
                          {m.goals_in_match > 0
                            ? <span className="text-sm font-bold text-orange-400">{m.goals_in_match}</span>
                            : <span className="text-xs text-slate-700">—</span>
                          }
                        </div>
                        <div className="text-center">
                          {m.assists_in_match > 0
                            ? <span className="text-sm font-bold text-violet-400">{m.assists_in_match}</span>
                            : <span className="text-xs text-slate-700">—</span>
                          }
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Calendar size={18} className="text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Aucun match joué cette saison.</p>
                </div>
              )}

              {/* ── Matchs MVP ── */}
              {(mvpData?.total_mvp ?? 0) > 0 && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(245,158,11,0.2)', backgroundColor: 'rgba(245,158,11,0.04)' }}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-2"
                    style={{ borderBottom: '1px solid rgba(245,158,11,0.15)' }}
                  >
                    <Star size={13} className="text-amber-400 fill-amber-400/40" />
                    <p className="text-xs font-semibold text-amber-500/80 uppercase tracking-wider">
                      Homme du match · {mvpData!.total_mvp}×
                    </p>
                  </div>
                  {mvpData!.mvp_matches.map((m, i) => (
                    <Link
                      key={m.match_id}
                      to={`/matches/${m.match_id}`}
                      onClick={onClose}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2 hover:bg-amber-500/5 transition-colors',
                        i < mvpData!.mvp_matches.length - 1 && 'border-b border-amber-500/10'
                      )}
                    >
                      <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">
                          {m.home_team_name} <span className="text-slate-500">vs</span> {m.away_team_name}
                        </p>
                        <p className="text-[10px] text-slate-500">J{m.matchday}</p>
                      </div>
                      <span className="text-xs font-bold text-white tabular-nums shrink-0">
                        {m.home_score}–{m.away_score}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
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
      <div className="card">
        <div className="empty-state py-6">
          <p className="text-slate-500 text-sm">Aucun joueur dans cette équipe.</p>
        </div>
      </div>
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
          <div className="glass-morphism p-4 rounded-2xl border border-white/5 bg-primary-500/5">
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              <span className="text-primary-400 font-black">TIP :</span> Cliquez sur un joueur pour voir ses statistiques détaillées. Utilisez l'icône <Pencil size={10} className="inline mx-1" /> pour mettre à jour les numéros de maillot et les positions.
            </p>
          </div>
        )}

        {/* Joueurs sans compte */}
        {pending.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                En attente ({pending.length})
              </p>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
            </div>
            <div className="glass-morphism rounded-3xl overflow-hidden border border-white/5">
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
            </div>
          </div>
        )}

        {/* Joueurs avec compte */}
        {linked.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                Comptes liés ({linked.length})
              </p>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
            </div>
            <div className="glass-morphism rounded-3xl overflow-hidden border border-white/5">
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
            </div>
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
      to={`/matches/${match.id}`}
      className="flex items-center gap-4 px-4 py-4 hover:bg-white/5 transition-all border-b border-white/[0.03] last:border-b-0 group"
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
                <span className="truncate max-w-[80px]">{match.venue}</span>
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
            <s.icon size={40} className="absolute -bottom-2 -right-2 text-white/[0.03] group-hover:text-white/10 transition-colors" />
          </div>
        ))}
      </div>

      {/* Filtres & Liste */}
      <div className="glass-morphism rounded-3xl overflow-hidden border border-white/5">
        <div className="flex p-1 bg-black/20 border-b border-white/5">
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
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Calendar size={20} className="text-slate-600" />
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Aucun match trouvé</p>
            <p className="text-slate-600 text-[10px] mt-1 uppercase tracking-wider font-bold">Modifiez vos filtres ou revenez plus tard.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {filtered.map(m => (
              <MatchRow key={m.id} match={m} teamId={teamId} />
            ))}
          </div>
        )}
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
  const broadcastUpdate = useCallback((type: 'formation' | 'player_selected', data: any) => {
    if (!nextMatch) return
    // Unification du canal tactique au niveau du match
    const channel = supabase.channel(`tactics-match-${nextMatch.id}`)
    channel.send({
      type: 'broadcast',
      event: 'tactical_update',
      payload: { type, ...data, teamId, captainName: profile?.full_name ?? 'Le Capitaine' }
    })
  }, [teamId, nextMatch, profile])

  // Listen for broadcasts (for players)
  useEffect(() => {
    if (!nextMatch || !readonly) return
    const channel = supabase.channel(`tactics-match-${nextMatch.id}`)
    channel
      .on('broadcast', { event: 'tactical_update' }, ({ payload }) => {
        const { type, teamId: updateTeamId, captainName, formation, playerName, playerId } = payload
        
        // On ne traite que si c'est notre équipe
        if (updateTeamId !== teamId) return

        let title = 'Tactique mise à jour'
        let message = `${captainName} a modifié la formation.`

        if (type === 'player_selected') {
          if (playerId === profile?.id || playerId === user?.id) {
            title = 'Tu es titulaire ! ⚽'
            message = `Le capitaine t'a sélectionné pour le match contre ${nextMatch.home_team_id === teamId ? (nextMatch.away_team as any)?.name : (nextMatch.home_team as any)?.name}`
          } else {
            message = `${captainName} a sélectionné ${playerName} dans le 5 majeur.`
          }
        } else if (type === 'formation') {
          message = `${captainName} a choisi la formation ${formation}.`
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

  if (lineupLoading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>

  if (!nextMatch) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center glass-morphism rounded-[2rem] border border-white/5">
        <Calendar size={40} className="text-slate-700 mb-4" />
        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Aucun match programmé</p>
        <p className="text-slate-600 text-[10px] mt-1 uppercase tracking-wider font-bold">La tactique sera disponible dès qu'un match sera planifié.</p>
      </div>
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
    } catch (err) { }
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
          playerId: p?.user_id,
          playerName: `${p?.first_name} ${p?.last_name}`
        })
      }
    } catch (err) { }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Match Compact */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-6 py-4 rounded-2xl bg-white/2 border border-white/5">
        <div className="text-center md:text-left">
          <p className="text-[9px] font-black text-primary-500 uppercase tracking-[0.3em]">Prochain Match</p>
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
              className="aspect-[3/4]"
            />
            {updateLineup.isPending && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-[2rem] flex items-center justify-center z-20">
                <LoadingSpinner size="lg" />
              </div>
            )}
          </div>

          <Link
            to={`/matches/${nextMatch.id}`}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-white/2 border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <ChevronRight size={14} />
            Détails du match complet
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Onglet Stats ──────────────────────────────────────────────────────────────

function TabStats({ teamId, seasonId }: { teamId: string; seasonId: string }) {
  const { data: scorers, isLoading } = useScorers(seasonId)

  if (isLoading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>

  const teamScorers = (scorers ?? [])
    .filter(s => s.team_id === teamId && (s.goals > 0 || s.assists > 0))
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)

  if (teamScorers.length === 0) {
    return (
      <div className="glass-morphism rounded-3xl p-10 text-center border border-white/5 bg-grid-pattern">
        <Target size={40} className="mx-auto mb-4 text-slate-700" />
        <p className="text-slate-400 font-black uppercase tracking-widest">Aucune statistique</p>
        <p className="text-slate-600 text-xs mt-2 font-bold uppercase tracking-widest">Disponible après les premiers matchs.</p>
      </div>
    )
  }

  const totalGoals = teamScorers.reduce((s, r) => s + r.goals, 0)
  const totalAssists = teamScorers.reduce((s, r) => s + r.assists, 0)

  return (
    <div className="space-y-6">
      {/* Totaux équipe premium */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-morphism p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-3xl font-black text-orange-400 tabular-nums">{totalGoals}</p>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Buts marqués</p>
          </div>
          <Target size={60} className="absolute -bottom-4 -right-4 text-orange-500/5 group-hover:text-orange-500/10 transition-colors" />
        </div>
        <div className="glass-morphism p-5 rounded-2xl border border-white/5 relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-3xl font-black text-blue-400 tabular-nums">{totalAssists}</p>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Passes décisives</p>
          </div>
          <Zap size={60} className="absolute -bottom-4 -right-4 text-blue-500/5 group-hover:text-blue-500/10 transition-colors" />
        </div>
      </div>

      {/* Tableau buteurs premium */}
      <div className="glass-morphism rounded-3xl overflow-hidden border border-white/5">
        <div className="grid grid-cols-[3rem_1fr_4rem_4rem] gap-2 px-6 py-4 bg-white/5 border-b border-white/5">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">#</span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Joueur</span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Buts</span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Passes</span>
        </div>

        <div className="divide-y divide-white/[0.03]">
          {teamScorers.map((row, i) => (
            <div
              key={row.player_id}
              className="grid grid-cols-[3rem_1fr_4rem_4rem] gap-2 items-center px-6 py-4 hover:bg-white/5 transition-colors group"
            >
              <span className={clsx(
                'text-xs font-black tabular-nums text-center',
                i === 0 ? 'text-amber-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-700' : 'text-slate-600'
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
                <p className="text-sm font-black text-slate-200 uppercase tracking-tight truncate group-hover:text-white">
                  {row.first_name} {row.last_name}
                </p>
              </div>

              <span className={clsx(
                'text-lg font-black tabular-nums text-center tracking-tighter',
                i === 0 ? 'text-orange-400' : 'text-white'
              )}>
                {row.goals}
              </span>

              <span className="text-sm font-bold text-slate-500 tabular-nums text-center group-hover:text-blue-400 transition-colors">
                {row.assists || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
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
      <div className="flex p-1 bg-black/40 backdrop-blur-md rounded-2xl border border-white/5">
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
                className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl shadow-lg"
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
      </motion.div>
    </motion.div>
  )
}

// ── Page principale capitaine ─────────────────────────────────────────────────

type Tab = 'joueurs' | 'matchs' | 'stats' | 'tactique'

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'joueurs', label: 'Joueurs', icon: Users },
  { id: 'matchs', label: 'Matchs', icon: Calendar },
  { id: 'tactique', label: 'Tactique', icon: Layout },
  { id: 'stats', label: 'Stats', icon: Target },
]

export function CaptainPage() {
  const { profile, isCaptain } = useAuth()
  const { data: season } = useActiveSeason()
  const { data: teams } = useTeams(season?.id)
  const { data: allPlayers } = usePlayers(season?.id)
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

  if (!isCaptain) return <Navigate to="/" replace />

  const myPlayer = (allPlayers ?? []).find(p => p.user_id === profile?.id)

  const myTeamTyped = (teams ?? []).find(t => {
    const team = t as unknown as TeamWithCaptain
    return (
      team.captain_id === profile?.id ||
      (myPlayer && team.captain_player_id === myPlayer.id)
    )
  }) as unknown as TeamWithCaptain | undefined

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

      {!season ? (
        <div className="card">
          <div className="empty-state py-6">
            <p className="text-slate-400 text-sm">Aucune saison active.</p>
          </div>
        </div>
      ) : !myTeamTyped ? (
        <div className="card">
          <div className="empty-state py-8">
            <Crown size={28} className="text-slate-600 mb-2" />
            <p className="text-slate-300 font-medium">Aucune équipe assignée</p>
            <p className="text-slate-500 text-sm mt-1">
              L'administrateur doit vous assigner comme capitaine d'une équipe.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Premium Team Hero */}
          <div className="relative overflow-hidden rounded-[2rem] glass-morphism border border-white/10 shadow-2xl mb-6">
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
                               border-4 border-[#161B22] flex items-center justify-center transition-all shadow-xl
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
                  <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5">
                    <Crown size={10} />
                    Capitaine
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400">
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
                      <button onClick={saveTeamName} className="px-4 py-1.5 rounded-lg bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-500">Sauver</button>
                      <button onClick={cancelEditName} className="px-4 py-1.5 rounded-lg bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10">Annuler</button>
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
                <div className="hidden lg:flex gap-8 px-8 py-4 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm">
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">
                      #{standings.findIndex(s => s.team_id === myTeamTyped.id) + 1 || '—'}
                    </p>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Rang</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">
                      {standings.find(s => s.team_id === myTeamTyped.id)?.points ?? 0}
                    </p>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Points</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-white">
                      {standings.find(s => s.team_id === myTeamTyped.id)?.played ?? 0}
                    </p>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Matchs</p>
                  </div>
                </div>
              )}
            </div>
          </div>

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
