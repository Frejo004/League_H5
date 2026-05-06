import { useState, useEffect, useRef } from 'react'
import { Crown, Users, Calendar, Target, MapPin, Pencil, Check, X as XIcon, ChevronRight, Zap, Star, BarChart2, TrendingUp, Camera } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Navigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuth } from '@/hooks/useAuth'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTeams, useUpdateTeam } from '@/hooks/useTeams'
import { usePlayersByTeam, usePlayers, useUpdatePlayer } from '@/hooks/usePlayers'
import { supabase } from '@/lib/supabase'
import { useMatches } from '@/hooks/useMatches'
import { useScorers } from '@/hooks/useScorers'
import { usePlayerProfile } from '@/hooks/usePlayerProfile'
import { usePlayerMvp } from '@/hooks/useMvpVotes'
import { InviteButton } from '@/components/ui/InviteButton'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { TeamWithCaptain, Player, PlayerPosition } from '@/types/database'
import type { MatchWithTeams } from '@/hooks/useMatches'

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

// ── Positions ─────────────────────────────────────────────────────────────────

const POSITIONS: { value: PlayerPosition; label: string }[] = [
  { value: 'goalkeeper', label: 'Gardien'   },
  { value: 'defender',   label: 'Défenseur' },
  { value: 'midfielder', label: 'Milieu'    },
  { value: 'forward',    label: 'Attaquant' },
]

function positionLabel(pos: PlayerPosition | null) {
  return POSITIONS.find(p => p.value === pos)?.label ?? '—'
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
  const [jersey, setJersey]   = useState(player.jersey_number?.toString() ?? '')
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
              {POSITIONS.map(pos => (
                <option key={pos.value} value={pos.value}>{pos.label}</option>
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

function ResultBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  return (
    <span className={clsx(
      'inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold shrink-0',
      result === 'W' && 'bg-green-600 text-white',
      result === 'D' && 'bg-slate-500 text-white',
      result === 'L' && 'bg-red-600 text-white',
    )}>
      {result === 'W' ? 'V' : result === 'L' ? 'D' : 'N'}
    </span>
  )
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
    cumGoals   += m.goals_in_match
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
                  { label: 'Matchs',  value: profile.matches_played, icon: Calendar, color: 'text-blue-400'   },
                  { label: 'Buts',    value: profile.goals,          icon: Target,   color: 'text-orange-400' },
                  { label: 'Passes',  value: profile.assists,        icon: Zap,      color: 'text-violet-400' },
                  { label: 'MVP',     value: mvpData?.total_mvp ?? 0, icon: Star,    color: 'text-amber-400'  },
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
                    const isHome  = m.home_team.id === profile.team_id
                    const opp     = isHome ? m.away_team : m.home_team
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
  const linked  = (players ?? []).filter(p => !!p.user_id)

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

      <div className="space-y-4">
        {/* Info — capitaine seulement */}
        {!readonly && (
          <div className="card bg-primary-600/8 border-primary-600/20">
            <p className="text-sm text-slate-300 leading-relaxed">
              Clique sur un joueur pour voir ses stats. <Pencil size={11} className="inline mb-0.5" /> pour modifier numéro/position.
              Lien d'invitation expire après <strong className="text-white">7 jours</strong>.
            </p>
          </div>
        )}

        {/* Joueurs sans compte */}
        {pending.length > 0 && (
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-surface-border bg-surface-raised">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                En attente d'inscription ({pending.length})
              </p>
            </div>
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
        )}

        {/* Joueurs avec compte */}
        {linked.length > 0 && (
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-surface-border bg-surface-raised">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Comptes liés ({linked.length})
              </p>
            </div>
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
  const myScore  = isHome ? match.home_score : match.away_score
  const oppScore = isHome ? match.away_score : match.home_score

  let result: 'W' | 'D' | 'L' | null = null
  if (isCompleted && myScore !== null && oppScore !== null) {
    result = myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D'
  }

  return (
    <Link
      to={`/matches/${match.id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-raised transition-colors border-b border-surface-border/40 last:border-b-0"
    >
      {/* Résultat badge */}
      <div className={clsx(
        'w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shrink-0',
        result === 'W' && 'bg-green-500/20 text-green-400',
        result === 'D' && 'bg-slate-500/20 text-slate-400',
        result === 'L' && 'bg-red-500/20 text-red-400',
        !result && 'bg-surface-raised text-slate-600',
      )}>
        {result ?? (isCancelled ? '✕' : '·')}
      </div>

      {/* Adversaire */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="w-6 h-6 rounded shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
          style={{ backgroundColor: oppTeam.color }}
        >
          {oppTeam.name[0]}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">
            {isHome ? 'vs' : '@'} {oppTeam.name}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <span>J{match.matchday}</span>
            {match.venue && (
              <>
                <span>·</span>
                <MapPin size={8} />
                <span className="truncate">{match.venue}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Score ou date */}
      <div className="shrink-0 text-right">
        {isCompleted ? (
          <span className={clsx(
            'text-base font-bold tabular-nums',
            result === 'W' ? 'text-green-400' : result === 'L' ? 'text-red-400' : 'text-slate-300'
          )}>
            {myScore} – {oppScore}
          </span>
        ) : isCancelled ? (
          <span className="text-xs text-red-500 font-semibold">Annulé</span>
        ) : match.scheduled_at ? (
          <div>
            <p className="text-sm font-semibold text-white">{formatTime(match.scheduled_at)}</p>
            <p className="text-[10px] text-slate-500">{formatDate(match.scheduled_at)}</p>
          </div>
        ) : (
          <span className="text-xs text-slate-600">À venir</span>
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
    if (filter === 'past')     return m.status === 'completed'
    return true
  })

  const upcoming = teamMatches.filter(m => m.status === 'scheduled').length
  const played   = teamMatches.filter(m => m.status === 'completed').length

  return (
    <div className="space-y-3">
      {/* Résumé rapide */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Joués',    value: played,              color: 'text-white' },
          { label: 'À venir',  value: upcoming,            color: 'text-blue-400' },
          { label: 'Total',    value: teamMatches.length,  color: 'text-slate-400' },
        ].map(s => (
          <div key={s.label} className="card py-3 text-center">
            <p className={clsx('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="card p-0 overflow-hidden">
        <div className="flex border-b border-surface-border">
          {(['all', 'upcoming', 'past'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx('sf-tab flex-1', filter === f && 'active')}
            >
              {f === 'all' ? 'Tous' : f === 'upcoming' ? 'À venir' : 'Passés'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state py-8">
            <Calendar size={20} className="text-slate-600 mb-2" />
            <p className="text-slate-500 text-sm">Aucun match</p>
          </div>
        ) : (
          <div>
            {filtered.map(m => (
              <MatchRow key={m.id} match={m} teamId={teamId} />
            ))}
          </div>
        )}
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
      <div className="card">
        <div className="empty-state py-8">
          <Target size={20} className="text-slate-600 mb-2" />
          <p className="text-slate-300 font-medium">Aucune statistique</p>
          <p className="text-slate-500 text-sm mt-1">Disponible après les premiers matchs.</p>
        </div>
      </div>
    )
  }

  const totalGoals   = teamScorers.reduce((s, r) => s + r.goals, 0)
  const totalAssists = teamScorers.reduce((s, r) => s + r.assists, 0)

  return (
    <div className="space-y-3">
      {/* Totaux équipe */}
      <div className="grid grid-cols-2 gap-2">
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-orange-400">{totalGoals}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Buts marqués</p>
        </div>
        <div className="card py-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{totalAssists}</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Passes décisives</p>
        </div>
      </div>

      {/* Tableau buteurs */}
      <div className="card p-0 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_3rem_3rem] gap-2 px-4 py-2.5 border-b border-surface-border">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">#</span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Joueur</span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center">Buts</span>
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center">Passes</span>
        </div>

        {teamScorers.map((row, i) => (
          <div
            key={row.player_id}
            className={clsx(
              'grid grid-cols-[2rem_1fr_3rem_3rem] gap-2 items-center px-4 py-2.5',
              'border-b border-surface-border/50 last:border-b-0',
              'hover:bg-surface-raised transition-colors'
            )}
          >
            <span className={clsx(
              'text-sm font-bold tabular-nums text-center',
              i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : 'text-slate-600'
            )}>
              {i + 1}
            </span>

            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: row.team_color }}
              >
                {row.first_name[0]}{row.last_name[0]}
              </div>
              <p className="text-sm font-medium text-slate-200 truncate">
                {row.first_name} {row.last_name}
              </p>
            </div>

            <span className={clsx(
              'text-base font-bold tabular-nums text-center',
              i === 0 ? 'text-orange-400' : 'text-white'
            )}>
              {row.goals}
            </span>

            <span className="text-sm text-slate-500 tabular-nums text-center">
              {row.assists || '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Contenu équipe partagé (capitaine + joueur) ───────────────────────────────

export function TeamView({
  teamId,
  teamColor,
  seasonId,
  readonly = false,
}: {
  teamId: string
  teamColor: string
  seasonId: string
  readonly?: boolean
}) {
  const [activeTab, setActiveTab] = useState<Tab>('joueurs')

  return (
    <div className="card p-0 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-surface-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}            className={clsx(
              'sf-tab flex-1 flex items-center justify-center gap-1.5',
              activeTab === id && 'active'
            )}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Contenu onglet */}
      <div className="p-3">
        {activeTab === 'joueurs' && (
          <TabJoueurs teamId={teamId} teamColor={teamColor} seasonId={seasonId} readonly={readonly} />
        )}
        {activeTab === 'matchs' && (
          <TabMatchs teamId={teamId} seasonId={seasonId} />
        )}
        {activeTab === 'stats' && (
          <TabStats teamId={teamId} seasonId={seasonId} />
        )}
      </div>
    </div>
  )
}

// ── Page principale capitaine ─────────────────────────────────────────────────

type Tab = 'joueurs' | 'matchs' | 'stats'

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'joueurs', label: 'Joueurs',  icon: Users    },
  { id: 'matchs',  label: 'Matchs',   icon: Calendar },
  { id: 'stats',   label: 'Stats',    icon: Target   },
]

export function CaptainPage() {
  const { profile, isCaptain } = useAuth()
  const { data: season } = useActiveSeason()
  const { data: teams } = useTeams(season?.id)
  const { data: allPlayers } = usePlayers(season?.id)

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
          {/* Team info card */}
          <div className="card flex items-center gap-3">
            {/* Logo / couleur avec bouton upload */}
            <div className="relative shrink-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg overflow-hidden"
                style={{ backgroundColor: myTeamTyped.color ?? '#16a34a' }}
              >
                {myTeamTyped.logo_url
                  ? <img src={myTeamTyped.logo_url} alt="" className="w-full h-full object-cover" />
                  : myTeamTyped.name[0]
                }
              </div>
              {/* Bouton caméra */}
              <button
                onClick={() => logoRef.current?.click()}
                disabled={logoUploading}
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary-600 hover:bg-primary-500
                           border-2 border-surface-card flex items-center justify-center transition-colors
                           disabled:opacity-50"
                title="Changer le logo"
                aria-label="Changer le logo de l'équipe"
              >
                {logoUploading
                  ? <LoadingSpinner size="sm" />
                  : <Camera size={9} className="text-white" />
                }
              </button>
              <input
                ref={logoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>

            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex flex-col gap-1">
                  <input
                    autoFocus
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveTeamName(); if (e.key === 'Escape') cancelEditName() }}
                    className="w-full px-2 py-1 rounded-lg bg-surface-raised border border-primary-500
                               text-white text-sm font-semibold focus:outline-none"
                    maxLength={40}
                  />
                  {nameError && <p className="text-[10px] text-red-400">{nameError}</p>}
                </div>
              ) : (
                <>
                  <p className="font-semibold text-white">{myTeamTyped.name}</p>
                  <p className="text-xs text-slate-500">{season.name}</p>
                  {logoError && <p className="text-[10px] text-red-400 mt-0.5">{logoError}</p>}
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {!editingName ? (
                <>
                  <button
                    onClick={startEditName}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-surface-raised transition-colors"
                    title="Renommer l'équipe"
                    aria-label="Renommer l'équipe"
                  >
                    <Pencil size={13} />
                  </button>
                  <Crown size={13} className="text-amber-400" />
                  <span className="text-xs text-amber-400 font-semibold">Capitaine</span>
                </>
              ) : (
                <>
                  <button
                    onClick={saveTeamName}
                    disabled={updateTeam.isPending}
                    className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                    title="Enregistrer"
                    aria-label="Enregistrer le nom"
                  >
                    {updateTeam.isPending ? <LoadingSpinner size="sm" /> : <Check size={14} />}
                  </button>
                  <button
                    onClick={cancelEditName}
                    disabled={updateTeam.isPending}
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
