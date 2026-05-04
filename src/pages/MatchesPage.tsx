import { useState } from 'react'
import { Calendar, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMatches, type MatchWithTeams } from '@/hooks/useMatches'
import { useRealtimeMatches } from '@/hooks/useRealtime'
import { PageHero } from '@/components/ui/PageHero'
import { SkeletonMatchCard } from '@/components/ui/SkeletonLoader'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(dateStr: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

function formatDay(dateStr: string) {
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

// ── Match card — style Sofascore ──────────────────────────────────────────────

function MatchCard({ match }: { match: MatchWithTeams }) {
  const isCompleted = match.status === 'completed'
  const isCancelled = match.status === 'cancelled'
  const homeWon = isCompleted && match.home_score! > match.away_score!
  const awayWon = isCompleted && match.away_score! > match.home_score!
  const isDraw   = isCompleted && match.home_score === match.away_score

  return (
    <Link
      to={`/matches/${match.id}`}
      className="block hover:bg-surface-raised transition-colors border-b border-surface-border/40 last:border-b-0"
    >
      <div className="flex items-center px-4 py-4 gap-3">

        {/* Home team */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          {/* Logo / color swatch */}
          <div
            className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center
                       text-white font-bold text-lg"
            style={{ backgroundColor: match.home_team.color }}
          >
            {match.home_team.logo_url
              ? <img src={match.home_team.logo_url} alt="" className="w-10 h-10 object-contain rounded-lg" />
              : match.home_team.name[0]
            }
          </div>
          <span className={clsx(
            'text-xs font-semibold text-center leading-tight truncate w-full',
            homeWon ? 'text-white' : isCompleted ? 'text-slate-500' : 'text-slate-200'
          )}>
            {match.home_team.name}
          </span>
        </div>

        {/* Center — score or time */}
        <div className="flex flex-col items-center gap-1 shrink-0 min-w-[90px]">
          {isCompleted ? (
            <>
              <div className="flex items-center gap-3">
                <span className={clsx(
                  'text-3xl font-bold tabular-nums leading-none',
                  homeWon ? 'text-white' : isDraw ? 'text-slate-300' : 'text-slate-500'
                )}>
                  {match.home_score}
                </span>
                <span className="text-slate-600 text-lg font-light">-</span>
                <span className={clsx(
                  'text-3xl font-bold tabular-nums leading-none',
                  awayWon ? 'text-white' : isDraw ? 'text-slate-300' : 'text-slate-500'
                )}>
                  {match.away_score}
                </span>
              </div>
              <span className="text-[10px] font-bold text-primary-500 uppercase tracking-wider">
                Terminé
              </span>
            </>
          ) : isCancelled ? (
            <>
              <span className="text-lg font-bold text-slate-600">-</span>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Annulé</span>
            </>
          ) : match.scheduled_at ? (
            <>
              <span className="text-2xl font-bold text-white tabular-nums">
                {formatTime(match.scheduled_at)}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {formatDay(match.scheduled_at)}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-bold text-slate-500">À venir</span>
              <span className="text-[10px] text-slate-600">Date non définie</span>
            </>
          )}
        </div>

        {/* Away team */}
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <div
            className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center
                       text-white font-bold text-lg"
            style={{ backgroundColor: match.away_team.color }}
          >
            {match.away_team.logo_url
              ? <img src={match.away_team.logo_url} alt="" className="w-10 h-10 object-contain rounded-lg" />
              : match.away_team.name[0]
            }
          </div>
          <span className={clsx(
            'text-xs font-semibold text-center leading-tight truncate w-full',
            awayWon ? 'text-white' : isCompleted ? 'text-slate-500' : 'text-slate-200'
          )}>
            {match.away_team.name}
          </span>
        </div>
      </div>

      {/* Venue */}
      {match.venue && (
        <div className="flex items-center justify-center gap-1 pb-2 text-xs text-slate-600">
          <MapPin size={10} />
          {match.venue}
        </div>
      )}
    </Link>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function MatchesPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: matches, isLoading: matchesLoading } = useMatches(season?.id)
  const [activeMatchday, setActiveMatchday] = useState<number | null>(null)

  // Abonnement Realtime — scores mis à jour en direct
  useRealtimeMatches(season?.id)

  const isLoading = seasonLoading || matchesLoading
  const matchdays = [...new Set((matches ?? []).map(m => m.matchday))].sort((a, b) => a - b)
  const currentMatchday = activeMatchday ?? matchdays[0] ?? null
  const filtered = (matches ?? []).filter(m => m.matchday === currentMatchday)

  return (
    <div className="space-y-3">

      {/* Hero */}
      <PageHero
        imageUrl="https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=80&auto=format&fit=crop"
        pattern="net"
        accentColor="#3b82f6"
        title="Matchs"
        subtitle={season?.name}
        icon={<Calendar size={20} className="text-blue-400" />}
        stats={matches ? [
          { label: 'Journées',  value: matchdays.length },
          { label: 'Terminés', value: matches.filter(m => m.status === 'completed').length },
          { label: 'À venir',  value: matches.filter(m => m.status === 'scheduled').length },
        ] : undefined}
        compact
      />

      {isLoading ? (
        <div className="card p-0 overflow-hidden animate-fade-in">
          {[1,2,3,4].map(i => <SkeletonMatchCard key={i} />)}
        </div>
      ) : !season ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar size={20} /></div>
            <p className="text-slate-400">Aucune saison active</p>
          </div>
        </div>
      ) : !matches?.length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Calendar size={20} /></div>
            <p className="text-slate-300 font-medium">Aucun match programmé</p>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">

          {/* Matchday tabs */}
          <div className="flex overflow-x-auto scrollbar-none border-b border-surface-border">
            {matchdays.map(day => (
              <button
                key={day}
                onClick={() => setActiveMatchday(day)}
                className={clsx('sf-tab shrink-0', currentMatchday === day && 'active')}
              >
                J{day}
              </button>
            ))}
          </div>

          {/* Match cards */}
          <div>
            {filtered.map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
