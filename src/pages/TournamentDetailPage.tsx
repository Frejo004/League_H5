import { useParams } from 'react-router-dom'
import { useTournamentWithMatches } from '@/hooks/useTournaments'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PageHero } from '@/components/ui/PageHero'
import { Trophy, Calendar, Users, Clock, ArrowLeft, User, CheckCircle, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useRegisterTournament } from '@/hooks/useTournaments'
import clsx from 'clsx'

export function TournamentDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: tournament, isLoading, error } = useTournamentWithMatches(slug || '')
  const { user, isAdmin } = useAuth()
  const registerTournament = useRegisterTournament()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">Tournoi non trouvé</h2>
        <Link 
          to="/tournaments"
          className="mt-4 flex items-center gap-2 text-sm text-primary-400 hover:text-primary-300 transition-colors"
        >
          <ArrowLeft size={16} />
          Retour aux tournois
        </Link>
      </div>
    )
  }

  const isRegistered = tournament.participants?.some(p => p.player_id === user?.id)
  const canRegister = tournament.status === 'registration_open' && !isRegistered && user
  const isFull = tournament.max_participants && tournament.participants?.length >= tournament.max_participants

  const handleRegister = () => {
    if (user && tournament.id) {
      registerTournament.mutate({ tournamentId: tournament.id, playerId: user.id })
    }
  }

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

  const getTournamentTypeLabel = (type: string) => {
    switch (type) {
      case 'elimination': return 'Élimination directe'
      case 'swiss': return 'Système suisse'
      case 'round_robin': return 'Tous contre tous'
      default: return type
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

  const statusConfig = getStatusConfig(tournament.status)

  return (
    <div className="space-y-6">
      {/* Retour */}
      <Link 
        to="/tournaments" 
        className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={16} />
        Retour aux tournois
      </Link>

      {/* Hero avec titre et statut */}
      <div className="glass-morphism rounded-2xl p-6 md:p-8 border border-surface-border">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 shrink-0">
                <Trophy size={24} className="text-purple-400" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wide text-text-primary">
                {tournament.name}
              </h1>
            </div>
            
            <span className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border',
              statusConfig.color, statusConfig.bg, statusConfig.border
            )}>
              {statusConfig.label}
            </span>
          </div>
          
          {canRegister && !isFull && (
            <button
              onClick={handleRegister}
              disabled={registerTournament.isPending}
              className="px-6 py-3 rounded-xl bg-primary-500 text-white text-sm font-black uppercase tracking-wider hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              {registerTournament.isPending ? 'Inscription...' : "S'inscrire"}
            </button>
          )}

          {isRegistered && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/15 border border-green-500/30">
              <CheckCircle size={16} className="text-green-400" />
              <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Inscrit</span>
            </div>
          )}
        </div>

        {tournament.description && (
          <p className="text-text-secondary leading-relaxed mb-6">
            {tournament.description}
          </p>
        )}

        {/* Infos principales */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {tournament.starts_at && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-muted/30">
              <Calendar size={18} className="text-text-muted shrink-0" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-text-muted mb-0.5">Début</p>
                <p className="text-xs font-semibold text-text-primary">
                  {new Date(tournament.starts_at).toLocaleDateString('fr-FR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-muted/30">
            <Users size={18} className="text-text-muted shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-text-muted mb-0.5">Participants</p>
              <p className="text-xs font-semibold text-text-primary">
                {tournament.participants?.length || 0}
                {tournament.max_participants && ` / ${tournament.max_participants}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-muted/30">
            <Clock size={18} className="text-text-muted shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-text-muted mb-0.5">Format</p>
              <p className="text-xs font-semibold text-text-primary">
                {getTournamentTypeLabel(tournament.tournament_type)}
              </p>
            </div>
          </div>
        </div>

        {tournament.prize && (
          <div className="mt-6 pt-6 border-t border-surface-border">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-text-muted mb-0.5">Prix</p>
                <p className="text-sm font-bold text-primary-400">{tournament.prize}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Participants */}
      <div className="glass-morphism rounded-2xl p-6 border border-surface-border">
        <h2 className="text-lg font-black uppercase tracking-wide text-text-primary mb-4">
          Participants
        </h2>
        
        {tournament.participants && tournament.participants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tournament.participants.map((participant) => (
              <div 
                key={participant.id} 
                className="flex items-center gap-3 p-3 rounded-xl bg-surface-muted/20 hover:bg-surface-muted/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center text-primary-400 font-black text-sm shrink-0">
                  {participant.player?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate">
                    {participant.player?.username || 'Anonyme'}
                  </p>
                  <p className="text-xs text-text-muted">ELO: {participant.elo_rating}</p>
                </div>
                {participant.status === 'confirmed' && (
                  <CheckCircle size={16} className="text-green-400 shrink-0" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-muted text-center py-8">Aucun participant pour le moment</p>
        )}
      </div>

      {/* Matchs */}
      {tournament.matches && tournament.matches.length > 0 && (
        <div className="glass-morphism rounded-2xl p-6 border border-surface-border">
          <h2 className="text-lg font-black uppercase tracking-wide text-text-primary mb-6">
            Matchs du tournoi
          </h2>
          
          <div className="space-y-8">
            {Object.entries(matchesByRound).map(([round, matches]) => (
              <div key={round}>
                <h3 className="text-sm font-black uppercase tracking-wider text-primary-400 mb-4">
                  Ronde {round}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matches?.map((match) => (
                    <div 
                      key={match.id} 
                      className="glass-morphism rounded-xl p-4 border border-surface-border hover:border-primary-500/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">
                          Match #{match.match_number}
                        </span>
                        <span className={clsx(
                          'text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full',
                          match.status === 'completed' ? 'bg-green-500/15 text-green-400 border border-green-500/30' :
                          match.status === 'in_progress' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                          'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                        )}>
                          {match.status === 'completed' ? 'Terminé' :
                           match.status === 'in_progress' ? 'En cours' :
                           'Programmé'}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className={clsx(
                          'flex items-center justify-between p-2 rounded-lg',
                          match.winner_id === match.player1_id && 'bg-green-500/10 border border-green-500/20'
                        )}>
                          <div className="flex items-center gap-2 min-w-0">
                            <User size={14} className="text-text-muted shrink-0" />
                            <span className="text-sm font-semibold text-text-primary truncate">
                              {match.player1?.username || 'TBD'}
                            </span>
                          </div>
                          {match.winner_id === match.player1_id && (
                            <CheckCircle size={14} className="text-green-400 shrink-0" />
                          )}
                        </div>
                        
                        <div className="text-center text-text-muted text-xs font-bold py-1">vs</div>
                        
                        <div className={clsx(
                          'flex items-center justify-between p-2 rounded-lg',
                          match.winner_id === match.player2_id && 'bg-green-500/10 border border-green-500/20'
                        )}>
                          <div className="flex items-center gap-2 min-w-0">
                            <User size={14} className="text-text-muted shrink-0" />
                            <span className="text-sm font-semibold text-text-primary truncate">
                              {match.player2?.username || 'TBD'}
                            </span>
                          </div>
                          {match.winner_id === match.player2_id && (
                            <CheckCircle size={14} className="text-green-400 shrink-0" />
                          )}
                        </div>
                      </div>
                      
                      {match.result && (
                        <div className="mt-3 pt-3 border-t border-surface-border text-center">
                          <span className="text-xs text-text-muted font-semibold">
                            {getMatchResultLabel(match.result)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Règles */}
      {tournament.rules && (
        <div className="glass-morphism rounded-2xl p-6 border border-surface-border">
          <h2 className="text-lg font-black uppercase tracking-wide text-text-primary mb-4">
            Règles du tournoi
          </h2>
          <div className="prose prose-invert max-w-none text-text-secondary whitespace-pre-line leading-relaxed">
            {tournament.rules}
          </div>
        </div>
      )}
    </div>
  )
}
