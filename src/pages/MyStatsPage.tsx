import { useMemo } from 'react'
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
import { POSITION_LABELS, ResultBadge } from '@/components/ui/SharedBadges'

// ── Helpers ───────────────────────────────────────────────────────────────────


function formatShortDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(new Date(dateStr))
}


// ── Composant interne qui charge les stats une fois le playerId connu ─────────

function PlayerStats({ playerId, seasonId }: { playerId: string; seasonId: string }) {
  const { data: profile, isLoading } = usePlayerProfile(playerId)
  const { data: mvpData } = usePlayerMvp(playerId, seasonId)
  const { data: scorers } = useScorers(seasonId)

  // Rang dans les buteurs globaux
  const scorerRank = scorers?.findIndex(s => s.player_id === playerId)
  const rankDisplay = scorerRank !== undefined && scorerRank >= 0 && (scorers?.[scorerRank]?.goals ?? 0) > 0
    ? scorerRank + 1
    : null

  const positionLabel = profile?.position
    ? POSITION_LABELS[profile.position as keyof typeof POSITION_LABELS] ?? profile.position
    : undefined

  // Évolution cumulative buts+passes (ordre chronologique)
  const evolution = useMemo(() => {
    const chronoMatches = profile?.recent_matches ? [...profile.recent_matches].reverse() : []
    return chronoMatches.reduce<{
      cumGoals: number
      cumAssists: number
      out: Array<{ matchday: number; goals: number; assists: number; result: 'W' | 'D' | 'L' }>
    }>((acc, m) => {
      const nextGoals = acc.cumGoals + m.goals_in_match
      const nextAssists = acc.cumAssists + m.assists_in_match
      return {
        cumGoals: nextGoals,
        cumAssists: nextAssists,
        out: [...acc.out, { matchday: m.matchday, goals: nextGoals, assists: nextAssists, result: m.result }],
      }
    }, { cumGoals: 0, cumAssists: 0, out: [] }).out
  }, [profile])

  const maxVal = useMemo(() => Math.max(...evolution.map(e => e.goals), 1), [evolution])

  if (isLoading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
  if (!profile) return (
    <div className="card">
      <div className="empty-state py-8">
        <Shield size={24} className="text-slate-600 mb-2" />
        <p className="text-slate-300 font-medium">Données indisponibles</p>
        <p className="text-slate-500 text-sm mt-1">Aucune statistique trouvée pour cette saison.</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">

      {/* ── Hero joueur Premium ── */}
      <div className="relative overflow-hidden rounded-2xl p-[2px]"
           style={{ background: 'linear-gradient(135deg, #FFDF73 0%, #B8860B 50%, #FFDF73 100%)' }}>
        
        <div className="relative bg-white dark:bg-slate-950 h-full rounded-2xl overflow-hidden p-6 flex items-center gap-5 bg-grid-pattern">
          <div className="absolute inset-0 bg-gradient-to-b from-[#B8860B]/10 dark:from-[#B8860B]/20 via-transparent to-[#B8860B]/30 pointer-events-none" />

          {/* Avatar avec glow or */}
          <div className="relative shrink-0 z-10">
            <div className="absolute inset-0 bg-[#FFDF73] blur-lg opacity-40 rounded-full" />
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-slate-800 text-3xl font-black shrink-0 border-2 border-[#FFDF73] shadow-2xl relative bg-slate-800"
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover rounded-full mix-blend-luminosity opacity-80" />
              ) : (
                <span className="text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  {profile.first_name[0]}{profile.last_name[0]}
                </span>
              )}
            </div>
            {/* Fallback si logo_url n'existe pas dans le type (on le retire pour éviter l'erreur) */}
            {/* Si un logo est ajouté plus tard dans le type, on pourra le remettre ici */}
          </div>

          <div className="flex-1 min-w-0 z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFDF73] to-white uppercase tracking-widest"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {profile.first_name} {profile.last_name}
              </h2>
              {profile.jersey_number && (
                <span className="text-lg font-black text-[#FFDF73] px-2 py-0.5 rounded bg-black/40 border border-[#B8860B]/30 shadow-inner"
                      style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  #{profile.jersey_number}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300 text-sm tracking-wide">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: profile.team.color }} />
                {profile.team.name}
              </div>
              {profile.position && (
                <span className="text-xs font-bold text-amber-700 dark:text-[#FFDF73] uppercase tracking-widest bg-amber-500/10 dark:bg-black/30 px-2 py-0.5 rounded border border-amber-500/20 dark:border-[#B8860B]/20">
                  {positionLabel}
                </span>
              )}
            </div>
          </div>
          {rankDisplay && (
            <div className="text-center shrink-0 z-10 hidden sm:block border-l border-[#B8860B]/30 pl-5">
              <p className="text-4xl font-black text-[#FFDF73] drop-shadow-lg" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                #{rankDisplay}
              </p>
              <p className="text-[10px] text-[#FFDF73]/70 font-bold uppercase tracking-widest mt-0.5">Buteurs</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats saison (KPIs Premium) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Matchs joués', value: profile.matches_played, icon: Calendar, color: 'text-slate-300', highlight: false },
          { label: 'Buts', value: profile.goals, icon: Target, color: 'text-[#FFDF73]', highlight: false },
          { label: 'Passes déc.', value: profile.assists, icon: Zap, color: 'text-emerald-400', highlight: false },
          { label: 'Homme du match', value: mvpData?.total_mvp ?? 0, icon: Star, color: 'text-amber-500', highlight: (mvpData?.total_mvp ?? 0) > 0 },
        ].map(({ label, value, icon: Icon, color, highlight }) => (
          <div
            key={label}
            className={clsx(
              'relative p-4 rounded-2xl glass-morphism border border-white/5 flex flex-col justify-center items-center gap-1 transition-all duration-300 hover:-translate-y-1',
              highlight && 'border-[#B8860B]/30 bg-gradient-to-b from-[#B8860B]/10 to-transparent'
            )}
          >
            <Icon size={18} className={clsx('mb-1 opacity-80', color)} />
            <p className={clsx('text-3xl font-black tabular-nums leading-none', highlight ? 'text-[#FFDF73] text-glow-sm' : 'text-white')}
               style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {value}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 text-center">{label}</p>
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
            const isHome = m.home_team.id === profile.team_id
            const opp = isHome ? m.away_team : m.home_team
            const myScore = isHome ? m.home_score : m.away_score
            const opScore = isHome ? m.away_score : m.home_score

            return (
              <Link
                key={m.match_id}
                to={`/matches/${m.match_slug || m.match_id}`}
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
              to={`/matches/${((m as unknown as { match_slug?: string | null }).match_slug) || m.match_id}`}
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
        to={`/players/${profile.slug || playerId}`}
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
