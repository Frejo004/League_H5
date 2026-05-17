import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { Calendar, Target, Zap, Star, TrendingUp, X as XIcon, BarChart2 } from 'lucide-react'
import { usePlayerProfile } from '@/hooks/usePlayerProfile'
import { usePlayerMvp } from '@/hooks/useMvpVotes'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { POSITION_LABELS, ResultBadge } from '@/components/ui/SharedBadges'
import type { Player } from '@/types/database'

function positionLabel(pos: string | null) {
  return pos ? POSITION_LABELS[pos] : '—'
}

function formatShortDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(new Date(dateStr))
}

export function PlayerStatsDrawer({
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
                        to={`/matches/${m.match_slug || m.match_id}`}
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
                      to={`/matches/${m.match_slug || m.match_id}`}
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
