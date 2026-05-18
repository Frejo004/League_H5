import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, ChevronRight, Play, Radio, Clock, Trophy, Zap, Trophy as TrophyIcon } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMatches, type MatchWithTeams } from '@/hooks/useMatches'
import { useRealtimeTeams, useRealtimeMatches } from '@/hooks/useRealtime'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { LiveBadge } from '@/components/live/LiveBadge'
import { clsx } from 'clsx'

function formatTime(dateStr: string | null) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(d)
}

function formatHour(dateStr: string | null) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(d)
}

function formatDay(dateStr: string | null) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString())    return "Aujourd'hui"
  if (d.toDateString() === tomorrow.toDateString()) return 'Demain'
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }).format(d)
}

// ══════════════════════════════════════════════════════
// STAT BADGE — gold, silver, bronze for top 3
// ══════════════════════════════════════════════════════
function StatPill({ value, label, liveActiv }: {
  value: number; label: string; liveActiv?: boolean
}) {
  return (
    <div className="relative overflow-hidden flex-1 text-center px-4 py-4 rounded-2xl border border-white/[0.04] bg-white/[0.02] backdrop-blur-sm group hover:bg-white/[0.04] transition-all duration-500">
      <div className={clsx(
        "absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full blur-2xl opacity-10 -translate-y-1/2",
        liveActiv ? "bg-red-500" : "bg-white"
      )} />
      <p className={clsx(
        "text-3xl font-black tabular-nums tracking-tighter group-hover:scale-110 transition-transform duration-500",
        liveActiv ? "text-red-400" : "text-white"
      )}>
        {value}
        {liveActiv && <span className="ml-0.5 text-sm">🔴</span>}
      </p>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600 mt-1.5">{label}</p>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// TEAM BLOCK
// ══════════════════════════════════════════════════════
function TeamBlock({ name, color, logoUrl, won, align, isCompleted }: {
  name: string; color: string; logoUrl: string | null
  won: boolean; align: 'left' | 'right'; isCompleted?: boolean
}) {
  return (
    <div className={clsx('flex items-center gap-2 flex-1 min-w-0', align === 'right' && 'flex-row-reverse')}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-lg"
        style={{ backgroundColor: color }}>
        {logoUrl
          ? <img src={logoUrl} alt="" className="w-9 h-9 object-contain rounded-[10px]" />
          : name[0]
        }
      </div>
      <span className={clsx(
        'text-xs font-bold leading-tight truncate',
        won ? 'text-slate-900 dark:text-white' : 'text-slate-100 dark:text-slate-200',
        align === 'right' && 'text-right'
      )}>
        {name}
      </span>
    </div>
  )
}

// ══════════════════════════════════════════════════════
// MATCH CARD
// ══════════════════════════════════════════════════════
function MatchCard({ match }: { match: MatchWithTeams }) {
  const isCompleted = match.status === 'completed'
  const isCancelled = match.status === 'cancelled'
  const isLive = match.status === 'live'
  const homeWon = isCompleted && match.home_score! > match.away_score!
  const awayWon = isCompleted && match.away_score! > match.home_score!

  return (
    <Link
      to={`/public/matches/${match.slug || match.id}`}
      className="group block"
    >
      <div className={clsx(
        'relative mx-8 my-2 rounded-2xl border transition-all duration-300',
        'hover:-translate-y-[2px] hover:shadow-xl overflow-hidden',
        'bg-white/[0.018] border-white/[0.07]',
        isLive ? '!border-red-500/40 !bg-red-500/[0.04]' : '',
        isCompleted ? 'border-white/[0.07]' : '',
      )}>
        {/* live top glow */}
        {isLive && (
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />
        )}

        <div className="flex items-center gap-2 px-4 py-3.5">

          <TeamBlock
            name={match.home_team.name}
            color={match.home_team.color}
            logoUrl={match.home_team.logo_url}
            won={homeWon}
            isCompleted={isCompleted}
            align="left"
          />

          {/* SCORE CENTER */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 min-w-[84px]">

            {isLive ? (
              <div className="flex items-center gap-2.5 bg-red-500/[0.12] px-4 py-2 rounded-xl border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                <span className="text-2xl font-black tabular-nums text-white">{match.home_score ?? 0}</span>
                <span className="text-red-500/40 text-sm font-black">:</span>
                <span className="text-2xl font-black tabular-nums text-white">{match.away_score ?? 0}</span>
              </div>
            ) : isCompleted ? (
              <div className="flex items-center gap-2.5 bg-white/[0.03] px-4 py-2 rounded-xl border border-white/[0.08]">
                <span className={clsx(
                  'text-2xl font-black tabular-nums',
                  homeWon ? 'text-slate-100' : 'text-slate-600 dark:text-slate-700'
                )}>
                  {match.home_score}
                </span>
                <span className="text-slate-700 dark:text-slate-800 text-sm">:</span>
                <span className={clsx(
                  'text-2xl font-black tabular-nums',
                  awayWon ? 'text-slate-100' : 'text-slate-600 dark:text-slate-700'
                )}>
                  {match.away_score}
                </span>
              </div>
            ) : isCancelled ? (
              <div className="bg-red-500/10 border border-red-500/25 px-3 py-1.5 rounded-xl">
                <span className="text-[10px] font-black text-red-400 uppercase tracking-wider">Annulé</span>
              </div>
            ) : match.scheduled_at ? (
              <div className="flex flex-col items-center bg-white/[0.03] border border-white/[0.08] px-3.5 py-2 rounded-xl text-center">
                <span className="text-base font-black text-slate-200 tabular-nums">
                  {formatHour(match.scheduled_at)}
                </span>
                <span className="text-[9px] text-slate-600 font-semibold flex items-center gap-1 mt-0.5">
                  <Calendar size={8} />{formatDay(match.scheduled_at)}
                </span>
              </div>
            ) : null}

            {/* BADGE STATUS */}
            {isLive && (
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="text-[9px] font-black text-red-400 uppercase tracking-[0.2em]">En Direct</span>
              </div>
            )}
            {isCompleted && !homeWon && !awayWon && (
              <span className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.1em]">Nul</span>
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

          {/* FLÈCHE */}
          <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0 ml-0.5" />
        </div>

        {/* Venue */}
        {match.venue && (
          <div className="flex items-center justify-center gap-1 pb-2 -mt-1 text-[10px] text-slate-600">
            <MapPin size={9} className="text-slate-500" />
            {match.venue}
          </div>
        )}
      </div>
    </Link>
  )
}

// ══════════════════════════════════════════════════════
// FILTER TABS
// ══════════════════════════════════════════════════════
function FilterTabs({ options, active, onChange }:
  { options: { key: string; label: string; icon: typeof Radio; count?: number }[]; active: string; onChange: (k: string) => void }
) {
  return (
    <div className="flex items-center gap-1.5 mx-8 px-1 py-1 rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-x-auto"
      style={{ scrollbarWidth: 'none' }}>
      {options.map((opt) => {
        const isActive = active === opt.key
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all duration-200',
              isActive
                ? 'bg-white/5 text-slate-200 shadow-sm'
                : 'text-slate-400 hover:text-slate-300'
            )}
          >
            <opt.icon size={11} />
            {opt.label}
            {opt.count !== undefined && (
              <span className={clsx('text-[9px] font-black px-1.2 py-0.5 rounded-md',
                isActive ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-500'
              )}>
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════
import { PublicLayout } from '@/components/layout/PublicLayout'

export function PublicMatchesPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: matches, isLoading: matchesLoading } = useMatches(season?.id)

  useRealtimeTeams(season?.id)
  useRealtimeMatches(season?.id)

  const isLoading = seasonLoading || matchesLoading
  const allMatches = useMemo(() => matches ?? [], [matches])

  const liveCount   = allMatches.filter(m => m.status === 'live').length
  const upcoming    = allMatches.filter(m => m.status === 'scheduled')
  const completed   = allMatches.filter(m => m.status === 'completed')
  const cancelled   = allMatches.filter(m => m.status === 'cancelled')

  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'completed'>(
    liveCount > 0 ? 'live' : 'all'
  )

  const visibleMatches = useMemo(() => {
    switch (filter) {
      case 'live':     return allMatches.filter(m => m.status === 'live')
      case 'upcoming': return allMatches.filter(m => m.status === 'scheduled')
      case 'completed':return allMatches.filter(m => m.status === 'completed')
      default:         return allMatches.filter(m => m.status !== 'cancelled')
    }
  }, [filter, allMatches])

  const tabs = [
    { key: 'all',        label: 'Tous',              icon: Calendar, count: undefined },
    { key: 'live',       label: 'Live',              icon: Play,     count: liveCount || undefined },
    { key: 'upcoming',   label: 'À venir',           icon: Clock,    count: upcoming.length || undefined },
    { key: 'completed',  label: 'Résultats',         icon: Trophy,   count: completed.length || undefined },
    ...(cancelled.length > 0 ? [{ key: 'cancelled' as const, label: 'Annulés', icon: Zap, count: cancelled.length }] : []),
  ]

  return (
    <PublicLayout>
      {/* HERO SECTION — Compact */}
      <section className="relative overflow-hidden mt-2 mx-2">
        <div className="absolute inset-0 rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, rgba(30,40,60,0.4) 0%, rgba(10,14,22,0) 60%)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        />
        <div className="absolute inset-0">
          {/* orb glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(200,241,53,0.06) 0%, transparent 65%)' }} />
        </div>
        <div className="relative z-10 px-6 py-8">
          <div className="max-w-5xl mx-auto flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C8F135]/10 border border-[#C8F135]/30 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8F135]" />
              <span className="text-[10px] font-black text-[#C8F135] uppercase tracking-[0.25em]">
                {season?.name ?? 'Saison en cours'}
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none mb-3"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              MATCHS
            </h1>
            <p className="text-slate-400 text-sm max-w-md text-center leading-relaxed">
              Programme des matchs, résumés et résultats en direct de la ligue H5
            </p>
          </div>
        </div>
      </section>

      {/* STAT PILLS */}
      {!isLoading && allMatches.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 mt-5">
          <div className="flex gap-3">
            <StatPill label="Matchs" value={allMatches.length} />
            <StatPill label="Live" value={liveCount} liveActiv={liveCount > 0} />
            <StatPill label="À venir" value={upcoming.length} />
            <StatPill label="Terminés" value={completed.length} />
          </div>
        </section>
      )}

      {/* FILTER TABS */}
      {!isLoading && allMatches.length > 0 && (
        <section className="max-w-5xl mx-auto mt-6 mb-2">
          <FilterTabs
            options={tabs}
            active={filter}
            onChange={(k) => setFilter(k as any)}
          />
        </section>
      )}

      {/* CONTENT */}
      <section className="max-w-5xl mx-auto mt-4 pb-16">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <LoadingSpinner size="lg" />
          </div>
        ) : !season ? (
          <div className="text-center py-24">
            <Calendar size={40} className="mx-auto mb-4 text-slate-700" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Aucune saison active</p>
          </div>
        ) : allMatches.length === 0 ? (
          <div className="text-center py-24">
            <Calendar size={40} className="mx-auto mb-4 text-slate-700" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Aucun match programmé</p>
          </div>
        ) : visibleMatches.length === 0 ? (
          <div className="text-center py-20">
            <Radio size={32} className="mx-auto mb-4 text-slate-700" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Pas de match dans cette catégorie</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {visibleMatches.map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  )
}
