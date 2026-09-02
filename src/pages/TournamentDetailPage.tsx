import { useParams } from 'react-router-dom'
import { useTournamentWithMatches } from '@/hooks/useTournaments'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Trophy, Calendar, Users, Clock, ArrowLeft, User, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useRegisterTournament } from '@/hooks/useTournaments'

export default function TournamentDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: tournament, isLoading, error } = useTournamentWithMatches(slug || '')
  const { user } = useAuth()
  const registerTournament = useRegisterTournament()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">Tournoi non trouvé</div>
      </div>
    )
  }

  const isRegistered = tournament.participants?.some(p => p.player_id === user?.id)
  const canRegister = tournament.status === 'registration_open' && !isRegistered && user
  const isFull = tournament.max_participants && tournament.participants?.length >= tournament.max_participants

  const handleRegister = () => {
    if (user && tournament.id) {
      // L'inscription utilise directement l'ID utilisateur Supabase, pas besoin de profil football
      registerTournament.mutate({ tournamentId: tournament.id, playerId: user.id })
    }
  }

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

  const getMatchResultLabel = (result: string | null) => {
    if (!result) return 'En attente'
    switch (result) {
      case 'player1_win': return 'Victoire J1'
      case 'player2_win': return 'Victoire J2'
      case 'draw': return 'Match nul'
      case 'abandon': return 'Abandon'
      default: return result
    }
  }

  // Group matches by round
  const matchesByRound = tournament.matches?.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = []
    }
    acc[match.round].push(match)
    return acc
  }, {} as Record<number, typeof tournament.matches>) || {}

  return (
    <div className="min-h-screen bg-surface p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Link to="/tournaments" className="inline-flex items-center text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour aux tournois
        </Link>

        {/* Tournament Header */}
        <div className="bg-surface-light rounded-lg p-8 mb-8 border border-surface-lighter">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center mb-4">
                <Trophy className="w-10 h-10 text-primary mr-3" />
                <h1 className="text-3xl font-bold text-white">{tournament.name}</h1>
              </div>
              
              <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium text-white mb-4 ${getStatusColor(tournament.status)}`}>
                {getStatusLabel(tournament.status)}
              </div>
              
              {tournament.description && (
                <p className="text-gray-400 mb-6">{tournament.description}</p>
              )}
            </div>
            
            {canRegister && !isFull && (
              <button
                onClick={handleRegister}
                disabled={registerTournament.isPending}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium"
              >
                {registerTournament.isPending ? 'Inscription...' : "S'inscrire"}
              </button>
            )}
          </div>

          {/* Tournament Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {tournament.starts_at && (
              <div className="flex items-center text-gray-400">
                <Calendar className="w-5 h-5 mr-3" />
                <span>{new Date(tournament.starts_at).toLocaleDateString('fr-FR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            )}
            
            <div className="flex items-center text-gray-400">
              <Users className="w-5 h-5 mr-3" />
              <span>{tournament.participants?.length || 0} participants</span>
              {tournament.max_participants && ` / ${tournament.max_participants}`}
            </div>
            
            <div className="flex items-center text-gray-400">
              <Clock className="w-5 h-5 mr-3" />
              <span className="capitalize">
                {tournament.tournament_type === 'elimination' ? 'Élimination directe' : 
                 tournament.tournament_type === 'swiss' ? 'Système suisse' : 
                 'Tous contre tous'}
              </span>
            </div>
          </div>

          {tournament.prize && (
            <div className="pt-4 border-t border-surface-light">
              <p className="text-primary font-medium text-lg">🏆 {tournament.prize}</p>
            </div>
          )}
        </div>

        {/* Participants */}
        <div className="bg-surface-light rounded-lg p-6 mb-8 border border-surface-lighter">
          <h2 className="text-xl font-bold text-white mb-4">Participants</h2>
          {tournament.participants && tournament.participants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournament.participants.map((participant) => (
                <div key={participant.id} className="flex items-center bg-surface rounded-lg p-4">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold mr-3">
                    {participant.player?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{participant.player?.username || 'Anonyme'}</p>
                    <p className="text-gray-400 text-sm">ELO: {participant.elo_rating}</p>
                  </div>
                  {participant.status === 'confirmed' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">Aucun participant pour le moment</p>
          )}
        </div>

        {/* Matches / Bracket */}
        {tournament.matches && tournament.matches.length > 0 && (
          <div className="bg-surface-light rounded-lg p-6 border border-surface-lighter">
            <h2 className="text-xl font-bold text-white mb-6">Matchs</h2>
            {Object.entries(matchesByRound).map(([round, matches]) => (
              <div key={round} className="mb-8">
                <h3 className="text-lg font-medium text-white mb-4">Ronde {round}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matches?.map((match) => (
                    <div key={match.id} className="bg-surface rounded-lg p-4 border border-surface-lighter">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-gray-400">Match #{match.match_number}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          match.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          match.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {match.status === 'completed' ? 'Terminé' :
                           match.status === 'in_progress' ? 'En cours' :
                           'Programmé'}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className={`flex items-center justify-between p-2 rounded ${
                          match.winner_id === match.player1_id ? 'bg-green-500/10' : ''
                        }`}>
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="text-white">{match.player1?.username || 'TBD'}</span>
                          </div>
                          {match.winner_id === match.player1_id && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        
                        <div className="text-center text-gray-400 text-sm py-1">vs</div>
                        
                        <div className={`flex items-center justify-between p-2 rounded ${
                          match.winner_id === match.player2_id ? 'bg-green-500/10' : ''
                        }`}>
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            <span className="text-white">{match.player2?.username || 'TBD'}</span>
                          </div>
                          {match.winner_id === match.player2_id && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </div>
                      
                      {match.result && (
                        <div className="mt-3 pt-3 border-t border-surface-light text-center">
                          <span className="text-sm text-gray-400">{getMatchResultLabel(match.result)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rules */}
        {tournament.rules && (
          <div className="bg-surface-light rounded-lg p-6 mt-8 border border-surface-lighter">
            <h2 className="text-xl font-bold text-white mb-4">Règles</h2>
            <div className="text-gray-400 whitespace-pre-line">{tournament.rules}</div>
          </div>
        )}
      </div>
    </div>
  )
}
