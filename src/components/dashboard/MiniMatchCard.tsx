import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import type { MatchWithTeams } from '@/hooks/useMatches'

function formatTime(dateStr: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr))
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === tomorrow.toDateString()) return 'Demain'
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(d)
}

export function MiniMatchCard({ match, variant, myTeamId }: {
  match: MatchWithTeams; variant: 'upcoming' | 'result'; myTeamId?: string | null
}) {
  const homeWon = match.home_score! > match.away_score!
  const awayWon = match.away_score! > match.home_score!
  const isMyMatch = myTeamId && (match.home_team_id === myTeamId || match.away_team_id === myTeamId)

  return (
    <Link to={`/matches/${match.slug || match.id}`}
      className="group relative flex flex-col mb-3 mx-4 mt-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <div className="absolute inset-0 bg-linear-to-r from-primary-500/0 via-primary-500/5 to-primary-500/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
      <div className="relative flex overflow-hidden rounded-lg clip-angled glass-morphism bg-surface-card border border-surface-border">
        {isMyMatch && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 shadow-[0_0_10px_rgba(37,99,235,0.8)]" />}
        {/* Home */}
        <div className="flex-1 flex items-center justify-between p-3 pl-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
            style={{ background: `linear-gradient(to right, ${match.home_team.color}, transparent)` }} />
          <div className="flex items-center gap-3 relative z-10 min-w-0">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg ring-1 ring-white/10 overflow-hidden bg-surface-card"
              style={{ borderLeft: `3px solid ${match.home_team.color}` }}>
              {match.home_team.logo_url ? <img src={match.home_team.logo_url} alt="" className="w-7 h-7 object-contain" /> : match.home_team.name[0]}
            </div>
            <span className={clsx('text-sm uppercase tracking-wide transition-colors line-clamp-1',
              variant === 'result' ? (homeWon ? 'font-black text-text-primary' : 'font-semibold text-text-muted') : 'font-bold text-text-secondary group-hover:text-text-primary')}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {match.home_team.name}
            </span>
          </div>
          {variant === 'result' && (
            <span className={clsx('text-3xl font-black tabular-nums leading-none ml-3 z-10',
              homeWon ? 'text-text-primary text-glow-sm' : 'text-text-muted')}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {match.home_score}
            </span>
          )}
        </div>
        {/* Centre */}
        <div className="w-12 shrink-0 flex flex-col items-center justify-center relative bg-black/20 z-20"
          style={{ clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0% 100%)' }}>
          {variant === 'result' ? (
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">FT</span>
              <div className="w-0.5 h-4 bg-surface-border mt-1" />
            </div>
          ) : match.scheduled_at ? (
            <span className="text-[11px] font-black text-primary-500 dark:text-primary-400 tracking-wider">{formatTime(match.scheduled_at)}</span>
          ) : (
            <span className="text-[10px] font-bold text-text-muted uppercase">VS</span>
          )}
        </div>
        {/* Away */}
        <div className="flex-1 flex items-center justify-between p-3 pr-4 relative overflow-hidden flex-row-reverse">
          <div className="absolute inset-0 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
            style={{ background: `linear-gradient(to left, ${match.away_team.color}, transparent)` }} />
          <div className="flex items-center gap-3 relative z-10 min-w-0 flex-row-reverse">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 shadow-lg ring-1 ring-white/10 overflow-hidden bg-surface-card"
              style={{ borderRight: `3px solid ${match.away_team.color}` }}>
              {match.away_team.logo_url ? <img src={match.away_team.logo_url} alt="" className="w-7 h-7 object-contain" /> : match.away_team.name[0]}
            </div>
            <span className={clsx('text-sm uppercase tracking-wide transition-colors line-clamp-1',
              variant === 'result' ? (awayWon ? 'font-black text-text-primary' : 'font-semibold text-text-muted') : 'font-bold text-text-secondary group-hover:text-text-primary')}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {match.away_team.name}
            </span>
          </div>
          {variant === 'result' && (
            <span className={clsx('text-3xl font-black tabular-nums leading-none mr-3 z-10',
              awayWon ? 'text-text-primary text-glow-sm' : 'text-text-muted')}
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {match.away_score}
            </span>
          )}
        </div>
      </div>
      {variant === 'upcoming' && match.scheduled_at && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-surface-card border border-surface-border px-3 py-0.5 rounded-full z-30 shadow-md">
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">{formatDay(match.scheduled_at)}</span>
        </div>
      )}
    </Link>
  )
}
