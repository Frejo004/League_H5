import { useState } from 'react'
import { Trophy, Target, Zap, Calendar, ChevronDown, ChevronUp, Star } from 'lucide-react'
import { useSeasons } from '@/hooks/useSeasons'
import { usePalmaresData } from '@/hooks/usePalmaresData'
import { PageHero } from '@/components/ui/PageHero'
import { SkeletonCard, SkeletonKpiGrid } from '@/components/ui/SkeletonLoader'
import { clsx } from 'clsx'
import type { Season } from '@/types/database'

// ── Carte KPI d'une saison ────────────────────────────────────────────────────
function SeasonKpi({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: typeof Trophy; color: string
}) {
  return (
    <div className="stat-card flex items-center gap-3">
      <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${color}18` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
        <p className="text-sm font-bold text-white truncate">{value}</p>
      </div>
    </div>
  )
}

// ── Bloc détail d'une saison ──────────────────────────────────────────────────
function SeasonDetail({ season }: { season: Season }) {
  const { data, isLoading } = usePalmaresData(season.id)

  if (isLoading) {
    return (
      <div className="space-y-3 pt-3 animate-fade-in">
        <SkeletonKpiGrid count={4} />
        <SkeletonCard lines={4} />
      </div>
    )
  }

  if (!data) return null

  const { champion, topScorer, topAssister, totalGoals, totalMatches, standings } = data

  return (
    <div className="space-y-4 pt-3 animate-fade-in-up">

      {/* Champion banner */}
      {champion && (
        <div
          className="relative overflow-hidden rounded-xl p-4 flex items-center gap-4"
          style={{
            background: `linear-gradient(135deg, ${champion.team_color}20 0%, ${champion.team_color}08 100%)`,
            border: `1px solid ${champion.team_color}35`,
          }}
        >
          {/* Glow */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{ background: `radial-gradient(ellipse 60% 80% at 0% 50%, ${champion.team_color} 0%, transparent 70%)` }}
          />
          <div className="relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white font-black text-lg"
            style={{ backgroundColor: champion.team_color }}>
            {champion.team_logo
              ? <img src={champion.team_logo} alt="" className="w-10 h-10 object-contain rounded-lg" />
              : champion.team_name[0]
            }
          </div>
          <div className="relative min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-yellow-400/80 mb-0.5">
              🏆 Champion
            </p>
            <p className="text-lg font-black text-white truncate">{champion.team_name}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {champion.points} pts · {champion.won}V {champion.drawn}N {champion.lost}D
            </p>
          </div>
          <div className="relative text-right shrink-0">
            <p className="text-3xl font-black tabular-nums" style={{ color: champion.team_color }}>
              {champion.points}
            </p>
            <p className="text-[10px] text-slate-600">points</p>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <SeasonKpi label="Matchs joués"   value={totalMatches}  icon={Calendar} color="#3b82f6" />
        <SeasonKpi label="Buts marqués"   value={totalGoals}    icon={Target}   color="#f97316" />
        {topScorer && (
          <SeasonKpi
            label="Meilleur buteur"
            value={`${topScorer.first_name} ${topScorer.last_name} (${topScorer.goals})`}
            icon={Target}
            color="#f59e0b"
          />
        )}
        {topAssister && (
          <SeasonKpi
            label="Meilleur passeur"
            value={`${topAssister.first_name} ${topAssister.last_name} (${topAssister.assists})`}
            icon={Zap}
            color="#8b5cf6"
          />
        )}
      </div>

      {/* Classement final */}
      {standings.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-surface-border">
            <p className="section-title">Classement final</p>
          </div>
          <div className="stagger-fast">
            {standings.map((row, i) => (
              <div
                key={row.team_id}
                className={clsx(
                  'flex items-center gap-3 px-4 py-2.5 border-b border-surface-border/30 last:border-b-0',
                  i === 0 && 'bg-yellow-500/5'
                )}
              >
                {/* Rank */}
                <span className={clsx(
                  'w-6 text-center text-sm font-bold tabular-nums shrink-0',
                  i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : 'text-slate-600'
                )}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>

                {/* Team */}
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: row.team_color }}>
                  {row.team_logo
                    ? <img src={row.team_logo} alt="" className="w-6 h-6 object-contain rounded-full" />
                    : row.team_name[0]
                  }
                </div>
                <span className="flex-1 text-sm font-semibold text-slate-200 truncate">{row.team_name}</span>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 shrink-0">
                  <span><span className="text-green-400 font-semibold">{row.won}</span>V</span>
                  <span>{row.drawn}N</span>
                  <span><span className="text-red-400 font-semibold">{row.lost}</span>D</span>
                </div>

                <span className={clsx(
                  'text-base font-black tabular-nums shrink-0 w-8 text-right',
                  i === 0 ? 'text-yellow-400' : 'text-white'
                )}>
                  {row.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Carte saison cliquable ────────────────────────────────────────────────────
function SeasonCard({ season, isActive, isExpanded, onToggle }: {
  season: Season
  isActive: boolean
  isExpanded: boolean
  onToggle: () => void
}) {
  const formatDate = (d: string | null) =>
    d ? new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(new Date(d)) : null

  const start = formatDate(season.start_date)
  const end   = formatDate(season.end_date)

  return (
    <div className={clsx(
      'card p-0 overflow-hidden transition-all duration-200',
      isExpanded && 'border-primary-600/30'
    )}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-4 py-4 hover:bg-surface-raised transition-colors text-left"
      >
        {/* Icon */}
        <div className={clsx(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          isActive ? 'bg-green-500/15 border border-green-500/25' : 'bg-surface-raised border border-surface-border'
        )}>
          <Trophy size={18} className={isActive ? 'text-green-400' : 'text-slate-500'} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-white">{season.name}</p>
            {isActive && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/15 border border-green-500/25 px-2 py-0.5 rounded-full">
                <span className="live-dot" /> En cours
              </span>
            )}
            {season.is_locked && !isActive && (
              <span className="text-[10px] font-bold text-slate-500 bg-surface-raised border border-surface-border px-2 py-0.5 rounded-full">
                Terminée
              </span>
            )}
          </div>
          {(start || end) && (
            <p className="text-xs text-slate-500 mt-0.5">
              {start}{start && end ? ' → ' : ''}{end}
            </p>
          )}
        </div>

        {/* Chevron */}
        <div className={clsx(
          'shrink-0 transition-transform duration-200',
          isExpanded && 'rotate-180'
        )}>
          <ChevronDown size={16} className="text-slate-500" />
        </div>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-surface-border/50">
          <SeasonDetail season={season} />
        </div>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export function PalmaresPage() {
  const { data: seasons, isLoading } = useSeasons()
  const [expanded, setExpanded] = useState<string | null>(null)

  const toggle = (id: string) => setExpanded(v => v === id ? null : id)

  // Ouvre automatiquement la saison active au premier rendu
  const activeSeason = seasons?.find(s => s.is_active)

  return (
    <div className="space-y-3">

      <PageHero
        imageUrl="https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=1200&q=80&auto=format&fit=crop"
        pattern="hexagon"
        accentColor="#f59e0b"
        title="Palmarès"
        subtitle="Historique des saisons"
        icon={<Star size={20} className="text-yellow-400" />}
        stats={seasons?.length ? [
          { label: 'Saisons',  value: seasons.length },
          { label: 'Terminées', value: seasons.filter(s => s.is_locked).length },
        ] : undefined}
        compact
      />

      {isLoading ? (
        <div className="space-y-3 animate-fade-in">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : !seasons?.length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Trophy size={20} /></div>
            <p className="text-slate-400 font-medium">Aucune saison enregistrée</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 stagger">
          {seasons.map(season => (
            <SeasonCard
              key={season.id}
              season={season}
              isActive={season.is_active}
              isExpanded={expanded === season.id || (expanded === null && season.id === activeSeason?.id)}
              onToggle={() => toggle(season.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
