import { ArrowRight, Target, Zap, Calendar, Star, TrendingUp, BarChart2, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuth } from '@/hooks/useAuth'
import { useActiveSeason } from '@/hooks/useSeasons'
import { usePlayers } from '@/hooks/usePlayers'
import { usePlayerProfile } from '@/hooks/usePlayerProfile'
import { usePlayerMvp } from '@/hooks/useMvpVotes'
import { useScorers } from '@/hooks/useScorers'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'

// ── Helpers ───────────────────────────────────────────────────────────────────

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: 'Gardien',
  defender:   'Défenseur',
  midfielder: 'Milieu',
  forward:    'Attaquant',
}

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

// ── Composant interne qui charge les stats une fois le playerId connu ─────────

function PlayerStats({ playerId, seasonId }: { playerId: string; seasonId: string }) {
  const { data: profile, isLoading } = usePlayerProfile(playerId)
  const { data: mvpData } = usePlayerMvp(playerId, seasonId)
  const { data: scorers } = useScorers(seasonId)

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
  if (!profile)  return (
    <div className="card">
      <div className="empty-state py-8">
        <Shield size={24} className="text-slate-600 mb-2" />
        <p className="text-slate-300 font-medium">Données indisponibles</p>
        <p className="text-slate-500 text-sm mt-1">Aucune statistique trouvée pour cette saison.</p>
      </div>
    </div>
  )

  // Rang dans les buteurs globaux
  const scorerRank = scorers?.findIndex(s => s.player_id === playerId)
  const rankDisplay = scorerRank !== undefined && scorerRank >= 0 && (scorers?.[scorerRank]?.goals ?? 0) > 0
    ? scorerRank + 1
    : null

  // Évolution cumulative buts+passes (ordre chronologique)
  const chronoMatches = [...profile.recent_matches].reverse()
  let cumGoals = 0
  let cumAssists = 0
  const evolution = chronoMatches.map(m => {
    cumGoals   += m.goals_in_match
    cumAssists += m.assists_in_match
    return { matchday: m.matchday, goals: cumGoals, assists: cumAssists, result: m.result }
  })
  const maxVal = Math.max(...evolution.map(e => e.goals), 1)

  return (
    <div className="space-y-4">

      {/* ── Hero joueur ── */}
      <div className="card flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0 ring-2 ring-surface-border"
          style={{ backgroundColor: profile.team.color }}
        >
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
            : `${profile.first_name[0]}${profile.last_name[0]}`
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-white">
              {profile.first_name} {profile.last_name}
            </h2>
            {profile.jersey_number && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-surface-raised text-slate-400 border border-surface-border">
                #{profile.jersey_number}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: profile.team.color }} />
              <span className="text-sm text-slate-400">{profile.team.name}</span>
            </div>
            {profile.position && (
              <span className="text-sm text-slate-500">
                {POSITION_LABELS[profile.position] ?? profile.position}
              </span>
            )}
          </div>
        </div>
        {rankDisplay && (
          <div className="text-center shrink-0">
            <p className="text-2xl font-bold text-orange-400">#{rankDisplay}</p>
            <p className="text-[10px] text-slate-600 uppercase tracking-wider">Buteurs</p>
          </div>
        )}
      </div>

      {/* ── Stats saison ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Matchs joués',    value: profile.matches_played,  icon: Calendar, color: 'text-blue-400',   highlight: false },
          { label: 'Buts',            value: profile.goals,           icon: Target,   color: 'text-orange-400', highlight: false },
          { label: 'Passes déc.',     value: profile.assists,         icon: Zap,      color: 'text-violet-400', highlight: false },
          { label: 'Homme du match',  value: mvpData?.total_mvp ?? 0, icon: Star,     color: 'text-amber-400',  highlight: (mvpData?.total_mvp ?? 0) > 0 },
        ].map(({ label, value, icon: Icon, color, highlight }) => (
          <div
            key={label}
            className={clsx(
              'stat-card text-center',
              highlight && 'border-amber-500/30 bg-amber-500/5'
            )}
          >
            <Icon size={16} className={clsx('mx-auto mb-1.5', color)} />
            <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Évolution saison ── */}
      {evolution.length > 1 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-slate-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Évolution saison</p>
          </div>

          {/* Graphique barres buts cumulés */}
          <div className="flex items-end gap-1 h-20">
            {evolution.map((e, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full flex flex-col justify-end" style={{ height: 64 }}>
                  <div
                    className={clsx(
                      'w-full rounded-sm transition-all',
                      e.result === 'W' ? 'bg-green-500/70' : e.result === 'L' ? 'bg-red-500/70' : 'bg-slate-500/60'
                    )}
                    style={{ height: `${Math.max(4, (e.goals / maxVal) * 64)}px` }}
                    title={`J${e.matchday} · ${e.goals} but${e.goals > 1 ? 's' : ''} cumulé${e.goals > 1 ? 's' : ''}`}
                  />
                </div>
                <span className="text-[8px] text-slate-600">J{e.matchday}</span>
              </div>
            ))}
          </div>

          {/* Légende */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-400/70" />
              <span className="text-[10px] text-slate-500">Buts cumulés</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-500/70" />
              <span className="text-[10px] text-slate-500">Victoire</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500/70" />
              <span className="text-[10px] text-slate-500">Défaite</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-500/60" />
              <span className="text-[10px] text-slate-500">Nul</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Historique des matchs ── */}
      {profile.recent_matches.length > 0 ? (
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-surface-border bg-surface-raised">
            <BarChart2 size={13} className="text-slate-400" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Matchs joués ({profile.recent_matches.length})
            </p>
          </div>

          {/* En-têtes colonnes */}
          <div className="grid grid-cols-[3.5rem_1fr_2.5rem_2.5rem_2.5rem] gap-1 px-4 py-2 border-b border-surface-border/50">
            <span className="text-[9px] text-slate-600 uppercase tracking-wider">Date</span>
            <span className="text-[9px] text-slate-600 uppercase tracking-wider">Match</span>
            <span className="text-[9px] text-slate-600 uppercase tracking-wider text-center">Rés.</span>
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
                className={clsx(
                  'grid grid-cols-[3.5rem_1fr_2.5rem_2.5rem_2.5rem] gap-1 items-center px-4 py-2.5',
                  'hover:bg-surface-raised transition-colors',
                  i < profile.recent_matches.length - 1 && 'border-b border-surface-border/30'
                )}
              >
                <span className="text-[10px] text-slate-600 tabular-nums">
                  {formatShortDate(m.played_at)}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: opp.color }} />
                  <span className="text-xs text-slate-300 truncate">{opp.name}</span>
                  <span className="text-[10px] text-slate-600 shrink-0 tabular-nums">
                    {isHome ? '' : '@'} {myScore}–{opScore}
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
        <div className="card">
          <div className="empty-state py-6">
            <Calendar size={18} className="text-slate-600 mb-2" />
            <p className="text-slate-500 text-sm">Aucun match joué cette saison.</p>
          </div>
        </div>
      )}

      {/* ── Matchs MVP ── */}
      {(mvpData?.total_mvp ?? 0) > 0 && (
        <div className="card p-0 overflow-hidden border-amber-500/20 bg-amber-500/[0.03]">
          <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-amber-500/15 bg-amber-500/5">
            <Star size={14} className="text-amber-400 fill-amber-400/40 shrink-0" />
            <p className="text-xs font-semibold text-amber-500/80 uppercase tracking-wider">
              Homme du match · {mvpData!.total_mvp} fois
            </p>
          </div>
          {mvpData!.mvp_matches.map((m, i) => (
            <Link
              key={m.match_id}
              to={`/matches/${m.match_id}`}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 hover:bg-amber-500/5 transition-colors',
                i < mvpData!.mvp_matches.length - 1 && 'border-b border-amber-500/10'
              )}
            >
              <Star size={13} className="text-amber-400 fill-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {m.home_team_name} <span className="text-slate-500 font-normal">vs</span> {m.away_team_name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Journée {m.matchday}
                  {m.played_at && (
                    <> · {new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(m.played_at))}</>
                  )}
                </p>
              </div>
              <span className="text-sm font-bold text-white tabular-nums shrink-0">
                {m.home_score} – {m.away_score}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* Lien vers profil public */}
      <Link
        to={`/players/${playerId}`}
        className="flex items-center justify-between px-4 py-3 card hover:bg-surface-raised transition-colors group"
      >
        <span className="text-sm text-slate-400 group-hover:text-white transition-colors">
          Voir mon profil public
        </span>
        <ArrowRight size={14} className="text-slate-600 group-hover:text-white transition-colors" />
      </Link>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function MyStatsPage() {
  const { profile } = useAuth()
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: allPlayers, isLoading: playersLoading } = usePlayers(season?.id)

  const isLoading = seasonLoading || playersLoading

  // Trouve le player lié au compte connecté
  const myPlayer = (allPlayers ?? []).find(p => p.user_id === profile?.id)

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Target size={18} className="text-orange-400" />
        <h1 className="page-title">Mes Stats</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : !season ? (
        <div className="card">
          <div className="empty-state py-8">
            <Calendar size={24} className="text-slate-600 mb-2" />
            <p className="text-slate-400 text-sm">Aucune saison active.</p>
          </div>
        </div>
      ) : !myPlayer ? (
        <div className="card">
          <div className="empty-state py-8">
            <Shield size={24} className="text-slate-600 mb-2" />
            <p className="text-slate-300 font-medium">Aucun profil joueur trouvé</p>
            <p className="text-slate-500 text-sm mt-1">
              Tu n'es pas encore lié à un joueur dans cette saison.
            </p>
          </div>
        </div>
      ) : (
        <PlayerStats playerId={myPlayer.id} seasonId={season.id} />
      )}
    </div>
  )
}
