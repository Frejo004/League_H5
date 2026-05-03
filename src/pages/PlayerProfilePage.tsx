import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Target, Zap, Calendar, Shield } from 'lucide-react'
import { usePlayerProfile } from '@/hooks/usePlayerProfile'
import { useScorers } from '@/hooks/useScorers'
import { useActiveSeason } from '@/hooks/useSeasons'
import { SkeletonPlayerProfile } from '@/components/ui/SkeletonLoader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'

const POSITION_LABELS: Record<string, string> = {
  goalkeeper: 'Gardien',
  defender: 'Défenseur',
  midfielder: 'Milieu',
  forward: 'Attaquant',
}

function ResultBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  return (
    <span className={clsx(
      'inline-flex items-center justify-center w-5 h-5 rounded text-white text-[9px] font-bold shrink-0',
      result === 'W' && 'bg-green-600',
      result === 'D' && 'bg-slate-500',
      result === 'L' && 'bg-red-600',
    )}>
      {result === 'W' ? 'V' : result === 'L' ? 'D' : 'N'}
    </span>
  )
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  }).format(new Date(dateStr))
}

export function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { data: season } = useActiveSeason()
  const { data: player, isLoading } = usePlayerProfile(id)
  const { data: scorers } = useScorers(season?.id)

  if (isLoading) {
    return <SkeletonPlayerProfile />
  }

  if (!player) {
    return (
      <div className="card text-center py-16">
        <p className="text-slate-400">Joueur introuvable.</p>
        <Link to="/players" className="btn-secondary mt-4 inline-flex">← Retour</Link>
      </div>
    )
  }

  // Rang dans les buteurs
  const scorerRank = scorers?.findIndex(s => s.player_id === id)
  const rankDisplay = scorerRank !== undefined && scorerRank >= 0 ? scorerRank + 1 : null

  return (
    <div className="space-y-3 pb-10 animate-fade-in-up">

      {/* Back */}
      <Link to="/players"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors">
        <ArrowLeft size={14} />
        Joueurs
      </Link>

      {/* ── Hero card ── */}
      <div className="card">
        <div className="flex items-center gap-4">

          {/* Avatar / initiales */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center
                       text-white text-xl font-bold shrink-0 ring-2 ring-surface-border"
            style={{ backgroundColor: player.team.color }}
          >
            {player.avatar_url
              ? <img src={player.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
              : `${player.first_name[0]}${player.last_name[0]}`
            }
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">
                {player.first_name} {player.last_name}
              </h1>
              {player.jersey_number && (
                <span className="badge bg-surface-raised text-slate-400 border border-surface-border text-xs">
                  #{player.jersey_number}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {/* Équipe */}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: player.team.color }} />
                <span className="text-sm text-slate-400">{player.team.name}</span>
              </div>

              {/* Poste */}
              {player.position && (
                <span className="text-sm text-slate-500">
                  {POSITION_LABELS[player.position] ?? player.position}
                </span>
              )}
            </div>
          </div>

          {/* Rang buteur */}
          {rankDisplay && (
            <div className="text-center shrink-0">
              <p className="text-2xl font-bold text-orange-400">#{rankDisplay}</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">Buteurs</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats saison ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Matchs joués', value: player.matches_played, icon: Calendar,  color: 'text-blue-400' },
          { label: 'Buts',         value: player.goals,          icon: Target,    color: 'text-orange-400' },
          { label: 'Passes déc.',  value: player.assists,        icon: Zap,       color: 'text-violet-400' },
          { label: 'Buts/match',   value: player.matches_played > 0
              ? (player.goals / player.matches_played).toFixed(1)
              : '—',                                              icon: Shield,    color: 'text-primary-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card text-center">
            <Icon size={16} className={clsx('mx-auto mb-1.5', color)} />
            <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Derniers matchs ── */}
      {player.recent_matches.length > 0 && (
        <div className="card p-0 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-surface-border bg-surface-raised">
            <p className="section-title">Derniers matchs</p>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 px-4 py-2 border-b border-surface-border/50">
            <span className="section-title w-12 text-center">Date</span>
            <span className="section-title">Match</span>
            <span className="section-title w-8 text-center">Rés.</span>
            <span className="section-title w-6 text-center text-orange-400/70">⚽</span>
            <span className="section-title w-6 text-center text-violet-400/70">🅰</span>
          </div>

          {player.recent_matches.map((m, i) => {
            const isHome = m.home_team.id === player.team_id
            const opponent = isHome ? m.away_team : m.home_team
            const myScore  = isHome ? m.home_score : m.away_score
            const oppScore = isHome ? m.away_score : m.home_score

            return (
              <Link
                key={m.match_id}
                to={`/matches/${m.match_id}`}
                className={clsx(
                  'grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center px-4 py-2.5',
                  'hover:bg-surface-raised transition-colors',
                  i < player.recent_matches.length - 1 && 'border-b border-surface-border/30'
                )}
              >
                {/* Date */}
                <span className="text-xs text-slate-600 w-12 text-center tabular-nums">
                  {formatDate(m.played_at)}
                </span>

                {/* Match */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: opponent.color }} />
                  <span className="text-sm text-slate-300 truncate">{opponent.name}</span>
                  <span className="text-xs text-slate-600 shrink-0">
                    {isHome ? 'Dom.' : 'Ext.'}
                  </span>
                  <span className="text-xs font-bold text-slate-400 tabular-nums shrink-0">
                    {myScore}–{oppScore}
                  </span>
                </div>

                {/* Résultat */}
                <div className="flex justify-center w-8">
                  <ResultBadge result={m.result} />
                </div>

                {/* Buts */}
                <div className="w-6 text-center">
                  {m.goals_in_match > 0 ? (
                    <span className="text-sm font-bold text-orange-400">{m.goals_in_match}</span>
                  ) : (
                    <span className="text-xs text-slate-700">—</span>
                  )}
                </div>

                {/* Passes */}
                <div className="w-6 text-center">
                  {m.assists_in_match > 0 ? (
                    <span className="text-sm font-bold text-violet-400">{m.assists_in_match}</span>
                  ) : (
                    <span className="text-xs text-slate-700">—</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {player.recent_matches.length === 0 && (
        <div className="card">
          <div className="empty-state py-6">
            <div className="empty-state-icon"><Calendar size={18} /></div>
            <p className="text-slate-500 text-sm">Aucun match joué cette saison.</p>
          </div>
        </div>
      )}
    </div>
  )
}
