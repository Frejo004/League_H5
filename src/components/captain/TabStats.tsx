import { Target, Zap } from 'lucide-react'
import { clsx } from 'clsx'
import { useScorers } from '@/hooks/useScorers'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export function TabStats({ teamId, seasonId }: { teamId: string; seasonId: string }) {
  const { data: scorers, isLoading } = useScorers(seasonId)

  if (isLoading) return <div className="flex justify-center py-10"><LoadingSpinner /></div>

  const teamScorers = (scorers ?? [])
    .filter(s => s.team_id === teamId && (s.goals > 0 || s.assists > 0))
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)

  if (teamScorers.length === 0) {
    return (
      <Card className="p-0 overflow-hidden">
        <EmptyState
          icon={<Target size={20} />}
          title="Aucune statistique"
          description="Disponible après les premiers matchs."
          className="py-10"
        />
      </Card>
    )
  }

  const totalGoals = teamScorers.reduce((s, r) => s + r.goals, 0)
  const totalAssists = teamScorers.reduce((s, r) => s + r.assists, 0)

  return (
    <div className="space-y-6">
      {/* Totaux équipe premium */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-5 relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-3xl font-black text-orange-400 tabular-nums">{totalGoals}</p>
            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-1">Buts marqués</p>
          </div>
          <Target size={60} className="absolute -bottom-4 -right-4 text-orange-500/5 group-hover:text-orange-500/10 transition-colors" />
        </Card>
        <Card className="p-5 relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-3xl font-black text-blue-400 tabular-nums">{totalAssists}</p>
            <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-1">Passes décisives</p>
          </div>
          <Zap size={60} className="absolute -bottom-4 -right-4 text-blue-500/5 group-hover:text-blue-500/10 transition-colors" />
        </Card>
      </div>

      {/* Tableau buteurs premium */}
      <Card className="rounded-3xl overflow-hidden">
        <div className="grid grid-cols-[3rem_1fr_4rem_4rem] gap-2 px-6 py-4 bg-surface-raised border-b border-surface-border">
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">#</span>
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Joueur</span>
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest text-center">Buts</span>
          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest text-center">Passes</span>
        </div>

        <div className="divide-y divide-surface-border">
          {teamScorers.map((row, i) => (
            <div
              key={row.player_id}
              className="grid grid-cols-[3rem_1fr_4rem_4rem] gap-2 items-center px-6 py-4 hover:bg-white/5 transition-colors group"
            >
              <span className={clsx(
                'text-xs font-black tabular-nums text-center',
                i === 0 ? 'text-amber-400' : i === 1 ? 'text-text-secondary' : i === 2 ? 'text-amber-700' : 'text-text-muted'
              )}>
                {i + 1}
              </span>

              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0 shadow-lg transition-transform group-hover:scale-110"
                  style={{ backgroundColor: row.team_color }}
                >
                  {row.first_name[0]}{row.last_name[0]}
                </div>
                <p className="text-sm font-black text-text-secondary uppercase tracking-tight truncate group-hover:text-text-primary">
                  {row.first_name} {row.last_name}
                </p>
              </div>

              <span className={clsx(
                'text-lg font-black tabular-nums text-center tracking-tighter',
                i === 0 ? 'text-orange-400' : 'text-text-primary'
              )}>
                {row.goals}
              </span>

              <span className="text-sm font-bold text-text-muted tabular-nums text-center group-hover:text-primary-400 transition-colors">
                {row.assists || '—'}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
