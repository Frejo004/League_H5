import { useState } from 'react'
import { useTournaments } from '@/hooks/useTournaments'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Trophy, Calendar, Users, Clock, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Tournament } from '@/types/tournament'

export default function TournamentsPage() {
  const { data: tournaments, isLoading, error } = useTournaments()
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'in_progress' | 'completed'>('all')

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Erreur lors du chargement des tournois</div>
      </div>
    )
  }

  const filteredTournaments = tournaments?.filter(t => 
    filter === 'all' || t.status === filter
  ) || []

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-gray-500'
      case 'registration_open': return 'bg-green-500'
      case 'in_progress': return 'bg-blue-500'
      case 'completed': return 'bg-purple-500'
      case 'cancelled': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'upcoming': return 'À venir'
      case 'registration_open': return 'Inscriptions ouvertes'
      case 'in_progress': return 'En cours'
      case 'completed': return 'Terminé'
      case 'cancelled': return 'Annulé'
      default: return status
    }
  }

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Tournois</h1>
            <p className="text-gray-400">Participez aux tournois d'échecs de la communauté</p>
          </div>
          <button className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Créer un tournoi
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'upcoming', 'in_progress', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                filter === f
                  ? 'bg-primary text-white'
                  : 'bg-surface-light text-gray-400 hover:bg-surface-light/80'
              }`}
            >
              {f === 'all' ? 'Tous' : f === 'upcoming' ? 'À venir' : f === 'in_progress' ? 'En cours' : 'Terminés'}
            </button>
          ))}
        </div>

        {/* Tournaments Grid */}
        {filteredTournaments.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">Aucun tournoi disponible</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTournaments.map((tournament) => (
              <Link key={tournament.id} to={`/tournaments/${tournament.slug}`}>
                <div className="bg-surface-light rounded-lg hover:scale-105 transition-transform cursor-pointer border border-surface-lighter">
                  <div className="relative">
                    <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium text-white ${getStatusColor(tournament.status)}`}>
                      {getStatusLabel(tournament.status)}
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <Trophy className="w-8 h-8 text-primary mr-3" />
                        <h3 className="text-xl font-bold text-white">{tournament.name}</h3>
                      </div>
                      
                      {tournament.description && (
                        <p className="text-gray-400 mb-4 line-clamp-2">{tournament.description}</p>
                      )}
                      
                      <div className="space-y-2 text-sm text-gray-400">
                        {tournament.starts_at && (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>{new Date(tournament.starts_at).toLocaleDateString('fr-FR', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                        )}
                        
                        {tournament.max_participants && (
                          <div className="flex items-center">
                            <Users className="w-4 h-4 mr-2" />
                            <span>Max {tournament.max_participants} participants</span>
                          </div>
                        )}
                        
                        {tournament.tournament_type && (
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2" />
                            <span className="capitalize">
                              {tournament.tournament_type === 'elimination' ? 'Élimination directe' : 
                               tournament.tournament_type === 'swiss' ? 'Système suisse' : 
                               'Tous contre tous'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {tournament.prize && (
                        <div className="mt-4 pt-4 border-t border-surface-light">
                          <p className="text-primary font-medium">🏆 {tournament.prize}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
