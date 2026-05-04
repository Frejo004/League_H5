import { Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTeams } from '@/hooks/useTeams'
import { PageHero } from '@/components/ui/PageHero'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function TeamsPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: teams, isLoading: teamsLoading } = useTeams(season?.id)

  const isLoading = seasonLoading || teamsLoading

  return (
    <div className="space-y-3">

      {/* Hero */}
      <PageHero
        imageUrl="https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=1200&q=80&auto=format&fit=crop"
        pattern="dots"
        accentColor="#8b5cf6"
        title="Équipes"
        subtitle={season?.name}
        icon={<Users size={20} className="text-violet-400" />}
        stats={teams?.length ? [
          { label: 'Équipes',  value: teams.length },
          { label: 'Joueurs',  value: teams.reduce((acc, t) => {
            const count = (t as unknown as { players?: { count: number }[] }).players?.[0]?.count ?? 0
            return acc + count
          }, 0) },
        ] : undefined}
        compact
      />

      {isLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : !season ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={20} /></div>
            <p className="text-slate-400">Aucune saison active</p>
          </div>
        </div>
      ) : !teams?.length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={20} /></div>
            <p className="text-slate-300 font-medium">Aucune équipe enregistrée</p>
          </div>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          {teams.map((team, i) => {
            const playerCount = (team as unknown as { players?: { count: number }[] }).players?.[0]?.count ?? 0
            return (
              <Link
                key={team.id}
                to={`/teams/${team.id}`}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-surface-raised transition-colors
                            ${i < teams.length - 1 ? 'border-b border-surface-border/50' : ''}`}
              >
                {/* Color swatch */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: team.color }}
                >
                  {team.logo_url
                    ? <img src={team.logo_url} alt={team.name} className="w-8 h-8 object-contain rounded-md" />
                    : team.name[0].toUpperCase()
                  }
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200 truncate">{team.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {playerCount} joueur{playerCount !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Arrow */}
                <span className="text-slate-600 text-xs">›</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
