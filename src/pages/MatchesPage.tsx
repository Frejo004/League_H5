import { useState } from 'react'
import { Calendar, MapPin, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMatches, type MatchWithTeams } from '@/hooks/useMatches'
import { useRealtimeMatches, useRealtimeTeams } from '@/hooks/useRealtime'
import { PageHero } from '@/components/ui/PageHero'
import { SkeletonMatchCard } from '@/components/ui/SkeletonLoader'
import { clsx } from 'clsx'

function formatTime(dateStr: string) {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr))
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr)
  const today    = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString())    return "Aujourd'hui"
  if (d.toDateString() === tomorrow.toDateString()) return 'Demain'
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }).format(d)
}

// ── Team block ────────────────────────────────────────────────────────────────
function TeamBlock({ name, color, logoUrl, won, isCompleted, align }: {
  name: string; color: string; logoUrl: string | null
  won: boolean; isCompleted: boolean; align: 'left' | 'right'
}) {
  return (
    <div className={clsx('flex items-center gap-3 flex-1 min-w-0', align === 'right' && 'flex-row-reverse')}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-lg"
        style={{ backgroundColor: color }}>
        {logoUrl
          ? <img src={logoUrl} alt="" className="w-10 h-10 object-contain rounded-xl" />
          : name[0]
        }
      </div>
      <span className={clsx(
        'text-sm font-bold leading-tight truncate',
        won ? 'text-white' : isCompleted ? 'text-slate-500' : 'text-slate-200',
        align === 'right' && 'text-right'
      )}>
        {name}
      </span>
    </div>
  )
}

// ── Match card premium ────────────────────────────────────────────────────────
function MatchCard({ match }: { match: MatchWithTeams }) {
  const isCompleted = match.status === 'completed'
  const isCancelled = match.status === 'cancelled'
  const homeWon = isCompleted && match.home_score! > match.away_score!
  const awayWon = isCompleted && match.away_score! > match.home_score!
  const isDraw  = isCompleted && match.home_score === match.away_score

  return (
    <Link to={`/matches/${match.id}`} className="group block">
      <div className={clsx(
        'relative overflow-hidden mx-3 my-2 rounded-2xl border transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-xl',
        isCompleted
          ? 'border-white/6 hover:border-white/10'
          : 'border-primary-600/20 hover:border-primary-600/35'
      )}
        style={{ background: 'linear-gradient(135deg, #161c2d 0%, #0f1420 100%)' }}>

        {/* Subtle top glow for upcoming */}
        {!isCompleted && !isCancelled && (
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(37,99,235,0.6), transparent)' }} />
        )}

        <div className="flex items-center gap-2 px-4 py-4">
          <TeamBlock
            name={match.home_team.name}
            color={match.home_team.color}
            logoUrl={match.home_team.logo_url}
            won={homeWon}
            isCompleted={isCompleted}
            align="left"
          />

          {/* Center */}
          <div className="flex flex-col items-center gap-1 shrink-0 min-w-[88px]">
            {isCompleted ? (
              <>
                <div className="flex items-center gap-2.5 bg-black/40 px-4 py-2 rounded-xl border border-white/6">
                  <span className={clsx('text-2xl font-black tabular-nums leading-none',
                    homeWon ? 'text-white' : isDraw ? 'text-slate-300' : 'text-slate-600')}>
                    {match.home_score}
                  </span>
                  <span className="text-slate-700 text-sm font-light">–</span>
                  <span className={clsx('text-2xl font-black tabular-nums leading-none',
                    awayWon ? 'text-white' : isDraw ? 'text-slate-300' : 'text-slate-600')}>
                    {match.away_score}
                  </span>
                </div>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Terminé</span>
              </>
            ) : isCancelled ? (
              <>
                <div className="bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl">
                  <span className="text-xs font-black text-red-400">Annulé</span>
                </div>
              </>
            ) : match.scheduled_at ? (
              <>
                <div className="bg-primary-600/15 border border-primary-600/25 px-3 py-2 rounded-xl text-center">
                  <span className="text-lg font-black text-white tabular-nums leading-none block">
                    {formatTime(match.scheduled_at)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium capitalize">
                  {formatDay(match.scheduled_at)}
                </span>
              </>
            ) : (
              <div className="bg-surface-raised border border-surface-border px-3 py-1.5 rounded-xl">
                <span className="text-xs font-semibold text-slate-500">À venir</span>
              </div>
            )}
          </div>

          <TeamBlock
            name={match.away_team.name}
            color={match.away_team.color}
            logoUrl={match.away_team.logo_url}
            won={awayWon}
            isCompleted={isCompleted}
            align="right"
          />

          <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-500 transition-colors shrink-0 ml-1" />
        </div>

        {/* Venue */}
        {match.venue && (
          <div className="flex items-center justify-center gap-1 pb-3 -mt-1 text-xs text-slate-700">
            <MapPin size={9} />
            {match.venue}
          </div>
        )}
      </div>
    </Link>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function MatchesPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: matches, isLoading: matchesLoading } = useMatches(season?.id)
  const [activeMatchday, setActiveMatchday] = useState<number | null>(null)

  useRealtimeMatches(season?.id)
  useRealtimeTeams(season?.id)

  const isLoading    = seasonLoading || matchesLoading
  const matchdays    = [...new Set((matches ?? []).map(m => m.matchday))].sort((a, b) => a - b)
  const currentMatchday = activeMatchday ?? matchdays[0] ?? null
  const filtered     = (matches ?? []).filter(m => m.matchday === currentMatchday)

  const completedCount = filtered.filter(m => m.status === 'completed').length
  const scheduledCount = filtered.filter(m => m.status === 'scheduled').length

  return (
    <div className="space-y-3">

      <PageHero
        imageUrl="https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=1200&q=80&auto=format&fit=crop"
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
        <div className="rounded-2xl border border-white/6 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #161c2d 0%, #111827 100%)' }}>
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
        <div className="rounded-2xl border border-white/6 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #161c2d 0%, #111827 100%)' }}>

          {/* Matchday tabs — style pill */}
          <div className="flex items-center gap-1 px-3 py-3 border-b border-white/6 overflow-x-auto scrollbar-none">
            {matchdays.map(day => {
              const isActive = currentMatchday === day
              const dayMatches = (matches ?? []).filter(m => m.matchday === day)
              const allDone = dayMatches.every(m => m.status === 'completed')
              return (
                <button
                  key={day}
                  onClick={() => setActiveMatchday(day)}
                  className={clsx(
                    'relative flex flex-col items-center px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all duration-200',
                    isActive
                      ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/4 border border-transparent'
                  )}
                >
                  <span>J{day}</span>
                  {allDone && (
                    <span className="w-1 h-1 rounded-full bg-green-500 mt-0.5" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Journée summary */}
          {(completedCount > 0 || scheduledCount > 0) && (
            <div className="flex items-center gap-3 px-4 py-2 border-b border-white/4">
              {completedCount > 0 && (
                <span className="text-[10px] font-bold text-slate-600">
                  {completedCount} terminé{completedCount > 1 ? 's' : ''}
                </span>
              )}
              {scheduledCount > 0 && (
                <span className="text-[10px] font-bold text-primary-600/60">
                  {scheduledCount} à venir
                </span>
              )}
            </div>
          )}

          {/* Match cards */}
          <div className="py-1 stagger-fast">
            {filtered.map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
