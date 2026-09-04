import { useState } from 'react'
import { useTournaments } from '@/hooks/useTournaments'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PageHero } from '@/components/ui/PageHero'
import { Trophy, Calendar, Users, Clock, Plus, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import clsx from 'clsx'

export function TournamentsPage() {
  const { data: tournaments, isLoading, error } = useTournaments()
  const { isAdmin } = useAuth()
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'in_progress' | 'completed'>('all')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-text-muted">Erreur lors du chargement des tournois</p>
        </div>
      </div>
    )
  }

  const filteredTournaments = tournaments?.filter(t => 
    filter === 'all' || t.status === filter
  ) || []

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'upcoming': 
        return { color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/30', label: 'À venir' }
      case 'registration_open': 
        return { color: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/30', label: 'Inscriptions ouvertes' }
      case 'in_progress': 
        return { color: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/30', label: 'En cours' }
      case 'completed': 
        return { color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30', label: 'Terminé' }
      case 'cancelled': 
        return { color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', label: 'Annulé' }
      default: 
        return { color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/30', label: status }
    }
  }

  const getTournamentTypeLabel = (type: string) => {
    switch (type) {
      case 'elimination': return 'Élimination directe'
      case 'swiss': return 'Système suisse'
      case 'round_robin': return 'Tous contre tous'
      default: return type
    }
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <PageHero
        imageUrl="https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&q=80&auto=format&fit=crop"
        pattern="hexagon"
        title="Tournois"
        subtitle="Participez aux tournois d'échecs de la communauté"
        icon={<Trophy />}
      />

      {/* Header avec filtres et bouton création */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Filtres */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'upcoming', 'in_progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all',
                filter === f
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'glass-morphism text-text-muted hover:text-text-primary hover:bg-surface-muted/30'
              )}
            >
              {f === 'all' ? 'Tous' : f === 'upcoming' ? 'À venir' : f === 'in_progress' ? 'En cours' : 'Terminés'}
            </button>
          ))}
        </div>

        {/* Bouton création (admin uniquement) */}
        {isAdmin && (
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500 text-white text-xs font-black uppercase tracking-wider hover:bg-primary-600 transition-colors shadow-lg">
            <Plus size={16} />
            Créer un tournoi
          </button>
        )}
      </div>

      {/* Grille de tournois */}
      {filteredTournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 glass-morphism rounded-2xl">
          <Trophy className="w-16 h-16 text-text-muted/30 mb-4" />
          <p className="text-text-muted text-lg font-semibold">Aucun tournoi disponible</p>
          <p className="text-text-muted/70 text-sm mt-1">Revenez bientôt pour de nouveaux tournois</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((tournament) => {
            const statusConfig = getStatusConfig(tournament.status)
            
            return (
              <Link 
                key={tournament.id} 
                to={`/tournaments/${tournament.slug}`}
                className="group"
              >
                <div className="glass-morphism rounded-2xl overflow-hidden border border-surface-border hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
                  {/* Status badge */}
                  <div className="relative p-6 pb-4">
                    <div className={clsx(
                      'absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border',
                      statusConfig.color, statusConfig.bg, statusConfig.border
                    )}>
                      {statusConfig.label}
                    </div>
                    
                    {/* Titre */}
                    <div className="flex items-start gap-3 mb-4 pr-24">
                      <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 shrink-0">
                        <Trophy size={20} className="text-purple-400" />
                      </div>
                      <h3 className="text-lg font-black uppercase tracking-wide text-text-primary leading-tight group-hover:text-primary-400 transition-colors">
                        {tournament.name}
                      </h3>
                    </div>
                    
                    {/* Description */}
                    {tournament.description && (
                      <p className="text-sm text-text-muted line-clamp-2 mb-4">
                        {tournament.description}
                      </p>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="px-6 pb-6 space-y-2.5">
                    {tournament.starts_at && (
                      <div className="flex items-center gap-2.5 text-xs text-text-secondary">
                        <Calendar size={14} className="text-text-muted shrink-0" />
                        <span className="font-semibold">
                          {new Date(tournament.starts_at).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                    
                    {tournament.max_participants && (
                      <div className="flex items-center gap-2.5 text-xs text-text-secondary">
                        <Users size={14} className="text-text-muted shrink-0" />
                        <span className="font-semibold">
                          Maximum {tournament.max_participants} participants
                        </span>
                      </div>
                    )}
                    
                    {tournament.tournament_type && (
                      <div className="flex items-center gap-2.5 text-xs text-text-secondary">
                        <Clock size={14} className="text-text-muted shrink-0" />
                        <span className="font-semibold">
                          {getTournamentTypeLabel(tournament.tournament_type)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Prix */}
                  {tournament.prize && (
                    <div className="px-6 pb-6 pt-4 border-t border-surface-border/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🏆</span>
                        <p className="text-sm font-bold text-primary-400">{tournament.prize}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
