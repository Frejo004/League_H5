import { useState } from 'react'
import { Calendar, Check, TrendingUp } from 'lucide-react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { useMatches } from '@/hooks/useMatches'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { MatchRow } from '@/components/captain/MatchRow'

export function TabMatchs({ teamId, seasonId }: { teamId: string; seasonId: string }) {
  const { data: matches, isLoading } = useMatches(seasonId)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')

  if (isLoading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>

  const teamMatches = (matches ?? []).filter(
    m => m.home_team_id === teamId || m.away_team_id === teamId
  )

  const filtered = teamMatches.filter(m => {
    if (filter === 'upcoming') return m.status === 'scheduled'
    if (filter === 'past') return m.status === 'completed'
    return true
  })

  const upcoming = teamMatches.filter(m => m.status === 'scheduled').length
  const played = teamMatches.filter(m => m.status === 'completed').length

  return (
    <div className="space-y-6">
      {/* Résumé rapide premium */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Joués', value: played, color: 'text-text-primary', icon: Check },
          { label: 'À venir', value: upcoming, color: 'text-blue-400', icon: Calendar },
          { label: 'Total', value: teamMatches.length, color: 'text-text-muted', icon: TrendingUp },
        ].map(s => (
          <div key={s.label} className="glass-morphism p-4 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div className="relative z-10">
              <p className={clsx('text-2xl font-black tabular-nums', s.color)}>{s.value}</p>
              <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mt-1">{s.label}</p>
            </div>
            <s.icon size={40} className="absolute -bottom-2 -right-2 text-white/3 group-hover:text-white/10 transition-colors" />
          </div>
        ))}
      </div>

      {/* Filtres & Liste */}
      <div className="glass-morphism rounded-3xl overflow-hidden border border-surface-border">
        <div className="flex p-1 bg-black/20 border-b border-surface-border">
          {(['all', 'upcoming', 'past'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'relative flex-1 py-2.5 rounded-xl transition-all duration-300 text-[10px] font-black uppercase tracking-widest',
                filter === f ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
              )}
            >
              {filter === f && (
                <motion.div layoutId="matchFilterBg" className="absolute inset-0 bg-white/5 border border-white/10 rounded-xl" />
              )}
              <span className="relative z-10">
                {f === 'all' ? 'Tous' : f === 'upcoming' ? 'À venir' : 'Passés'}
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Card className="p-0 overflow-hidden">
            <EmptyState
              icon={<Calendar />}
              title="Aucun match trouvé"
              description="Modifiez vos filtres ou revenez plus tard."
              className="py-12"
            />
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="divide-y divide-surface-border">
              {filtered.map(m => (
                <MatchRow key={m.id} match={m} teamId={teamId} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
