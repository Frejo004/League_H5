import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Users, Target, Trophy } from 'lucide-react'
import { useTeam } from '@/hooks/useTeams'
import { useStandings } from '@/hooks/useStandings'
import { useMatches } from '@/hooks/useMatches'
import { useActiveSeason } from '@/hooks/useSeasons'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'
import type { Player, PlayerPosition, TeamRef } from '@/types/database'

const POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: 'Gardien',
  defender: 'Défenseur',
  midfielder: 'Milieu',
  forward: 'Attaquant',
}

function FormBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  return (
    <span className={clsx(
      'inline-flex items-center justify-center w-6 h-6 rounded-md text-white text-[10px] font-black',
      result === 'W' && 'bg-green-500/80',
      result === 'D' && 'bg-slate-600',
      result === 'L' && 'bg-red-500/80',
    )}>
      {result === 'W' ? 'V' : result === 'L' ? 'D' : 'N'}
    </span>
  )
}

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: season } = useActiveSeason()
  const { data: team, isLoading } = useTeam(id)
  const { data: standings } = useStandings(season?.id)
  const { data: matches } = useMatches(season?.id)

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
  }

  if (!team) {
    return (
      <div className="card text-center py-16">
        <p className="text-slate-400">Équipe introuvable.</p>
        <Link to="/teams" className="btn-secondary mt-4 inline-flex">← Retour aux équipes</Link>
      </div>
    )
  }

  const players = (team.players ?? []) as Player[]
  const standing = standings?.find(s => s.team_id === id)
  const form = standing?.form ?? []

  // Team matches (completed)
  const teamMatches = (matches ?? [])
    .filter(m => (m.home_team_id === id || m.away_team_id === id) && m.status === 'completed')
    .sort((a, b) => new Date(b.played_at ?? 0).getTime() - new Date(a.played_at ?? 0).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-4 pb-10">

      {/* Back */}
      <Link
        to="/teams"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft size={15} />
        Retour aux équipes
      </Link>

      {/* ── Team hero ── */}
      <div className="relative overflow-hidden rounded-2xl border border-surface-border bg-surface-card/80 p-6">
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ backgroundColor: team.color }}
        />
        <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-primary-500/30 to-transparent" />

        <div className="flex items-center gap-5">
          <div
            className="w-20 h-20 rounded-2xl ring-2 ring-white/10 flex items-center justify-center text-white text-3xl font-black shrink-0"
            style={{ backgroundColor: team.color }}
          >
            {team.logo_url
              ? <img src={team.logo_url} alt={team.name} className="w-16 h-16 object-contain rounded-xl" />
              : team.name[0].toUpperCase()
            }
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">{team.name}</h1>
            <p className="text-slate-500 text-sm mt-1">{players.length} joueur{players.length !== 1 ? 's' : ''}</p>
            {form.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                {form.slice(-5).map((r, i) => <FormBadge key={i} result={r} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      {standing && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Points', value: standing.points, highlight: true },
            { label: 'Victoires', value: standing.won },
            { label: 'Nuls', value: standing.drawn },
            { label: 'Défaites', value: standing.lost },
          ].map(({ label, value, highlight }) => (
            <div key={label} className={clsx(
              'rounded-xl p-3 text-center border',
              highlight
                ? 'bg-primary-600/15 border-primary-600/30'
                : 'bg-surface-card border-surface-border'
            )}>
              <p className={clsx(
                'text-2xl font-black',
                highlight ? 'text-primary-400' : 'text-white'
              )}>
                {value}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Players ── */}
      <div className="card space-y-3">
        <h2 className="section-title flex items-center gap-2">
          <Users size={12} className="text-primary-400" />
          Effectif
        </h2>

        {players.length === 0 ? (
          <div className="empty-state py-6">
            <div className="empty-state-icon"><Users size={18} /></div>
            <p className="text-slate-500 text-sm">Aucun joueur enregistré.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border/40">
            {players
              .filter(p => p.is_active)
              .sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99))
              .map(p => (
                <div key={p.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-slate-600 font-mono text-sm w-6 text-right shrink-0">
                    {p.jersey_number ?? '—'}
                  </span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden"
                    style={{ backgroundColor: team.color }}
                  >
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                      : `${p.first_name[0]}${p.last_name[0]}`
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">
                      {p.first_name} {p.last_name}
                    </p>
                  </div>
                  {p.position && (
                    <span className="badge bg-surface-border text-slate-400 text-[10px]">
                      {POSITION_LABELS[p.position]}
                    </span>
                  )}
                </div>
              ))
            }
          </div>
        )}
      </div>

      {/* ── Recent results ── */}
      {teamMatches.length > 0 && (
        <div className="card space-y-3">
          <h2 className="section-title flex items-center gap-2">
            <Trophy size={12} className="text-primary-400" />
            Derniers résultats
          </h2>

          <div className="space-y-1.5">
            {teamMatches.map(m => {
              const isHome = m.home_team_id === id
              const myScore = isHome ? m.home_score! : m.away_score!
              const oppScore = isHome ? m.away_score! : m.home_score!
              const opponent = (isHome ? m.away_team : m.home_team) as TeamRef
              const result: 'W' | 'D' | 'L' = myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D'

              return (
                <Link
                  key={m.id}
                  to={`/matches/${m.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/3 transition-colors"
                >
                  <FormBadge result={result} />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: opponent.color }} />
                    <span className="text-slate-300 text-sm truncate">{opponent.name}</span>
                  </div>
                  <span className="text-white font-bold text-sm tabular-nums shrink-0">
                    {isHome ? `${myScore} – ${oppScore}` : `${oppScore} – ${myScore}`}
                  </span>
                  <span className="text-xs text-slate-600 shrink-0">
                    {isHome ? 'Dom.' : 'Ext.'}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Goals stats */}
      {standing && (
        <div className="card">
          <h2 className="section-title flex items-center gap-2 mb-3">
            <Target size={12} className="text-primary-400" />
            Statistiques offensives
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xl font-black text-white">{standing.goals_for}</p>
              <p className="text-xs text-slate-500">Buts marqués</p>
            </div>
            <div>
              <p className="text-xl font-black text-white">{standing.goals_against}</p>
              <p className="text-xs text-slate-500">Buts encaissés</p>
            </div>
            <div>
              <p className={clsx(
                'text-xl font-black',
                standing.goal_diff > 0 ? 'text-green-400' : standing.goal_diff < 0 ? 'text-red-400' : 'text-white'
              )}>
                {standing.goal_diff > 0 ? `+${standing.goal_diff}` : standing.goal_diff}
              </p>
              <p className="text-xs text-slate-500">Différence</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
