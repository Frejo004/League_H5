import { useState, useEffect } from 'react'
import {
  MessageSquare, User, Users, AlertCircle, Calendar, Trophy,
  Star, ChevronRight, Edit2, Trash2, X, Save
} from 'lucide-react'
import { useMatches } from '@/hooks/useMatches'
import {
  useMatchFeedback, useAddMatchFeedback, useUpdateMatchFeedback,
  useDeleteMatchFeedback, useMyMatchFeedback
} from '@/hooks/useMatchFeedback'
import { useAuth } from '@/hooks/useAuth'
import { usePlayers } from '@/hooks/usePlayers'
import { useActiveSeason } from '@/hooks/useSeasons'
import type { MatchWithTeams, PlayerWithTeam, MatchFeedbackWithPlayer } from '@/types/database'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import clsx from 'clsx'

// Check if feedback is within 24hr edit window
function isWithinEditWindow(createdAt: string) {
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours <= 24
}

export function MatchFeedbackPage() {
  const { user, profile } = useAuth()
  const { data: activeSeason } = useActiveSeason()
  const { data: matches, isLoading: isLoadingMatches, error: matchesError } = useMatches(activeSeason?.id)
  const { data: seasonPlayers } = usePlayers(activeSeason?.id)
  
  // Add debug logging here
  console.log('user:', user)
  console.log('profile:', profile)
  console.log('seasonPlayers:', seasonPlayers)
  
  // Get current player
  const currentPlayer = seasonPlayers?.find((p: PlayerWithTeam) => p.user_id === user?.id)
  console.log('currentPlayer:', currentPlayer)
  const isAdmin = profile?.role === 'admin'
  
  // Selected match state
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const selectedMatch = matches?.find((m: MatchWithTeams) => m.id === selectedMatchId)
  
  // Check eligibility
  const isEligible = isAdmin || (
    currentPlayer && selectedMatch && (
      currentPlayer.team_id === selectedMatch.home_team_id || 
      currentPlayer.team_id === selectedMatch.away_team_id
    )
  )
  
  // My feedback
  const myFeedback = useMyMatchFeedback(selectedMatchId, currentPlayer?.id)
  const [isEditing, setIsEditing] = useState(false)
  
  // Form state
  const [overallExperience, setOverallExperience] = useState('')
  const [refereePerformance, setRefereePerformance] = useState('')
  const [playerBehavior, setPlayerBehavior] = useState('')
  const [otherComments, setOtherComments] = useState('')
  
  // Unsaved changes tracking
  const hasUnsavedChanges = 
    (overallExperience || refereePerformance || playerBehavior || otherComments) && 
    !(
      overallExperience === (myFeedback?.overall_experience || '') &&
      refereePerformance === (myFeedback?.referee_performance || '') &&
      playerBehavior === (myFeedback?.player_behavior || '') &&
      otherComments === (myFeedback?.other_comments || '')
    )
  
  // Mutations
  const addFeedback = useAddMatchFeedback()
  const updateFeedback = useUpdateMatchFeedback()
  const deleteFeedback = useDeleteMatchFeedback()
  
  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null)
  
  // Reset form when match or feedback changes
  useEffect(() => {
    setTimeout(() => {
      if (myFeedback && !isEditing) {
        setOverallExperience(myFeedback.overall_experience || '')
        setRefereePerformance(myFeedback.referee_performance || '')
        setPlayerBehavior(myFeedback.player_behavior || '')
        setOtherComments(myFeedback.other_comments || '')
      } else if (!myFeedback) {
        resetForm()
      }
    }, 0)
  }, [selectedMatchId, myFeedback, isEditing])
  
  function resetForm() {
    setOverallExperience('')
    setRefereePerformance('')
    setPlayerBehavior('')
    setOtherComments('')
    setIsEditing(false)
  }
  
  function handleMatchChange(newMatchId: string) {
    if (newMatchId === selectedMatchId) return
    
    if (hasUnsavedChanges) {
      setPendingMatchId(newMatchId)
      setShowConfirmModal(true)
    } else {
      setSelectedMatchId(newMatchId)
    }
  }
  
  function confirmMatchChange() {
    if (pendingMatchId) {
      resetForm()
      setSelectedMatchId(pendingMatchId)
      setPendingMatchId(null)
      setShowConfirmModal(false)
    }
  }
  
  function cancelMatchChange() {
    setPendingMatchId(null)
    setShowConfirmModal(false)
  }
  
  function startEditing() {
    if (myFeedback) {
      setOverallExperience(myFeedback.overall_experience || '')
      setRefereePerformance(myFeedback.referee_performance || '')
      setPlayerBehavior(myFeedback.player_behavior || '')
      setOtherComments(myFeedback.other_comments || '')
      setIsEditing(true)
    }
  }
  
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    console.log('handleSubmit called')
    console.log('currentPlayer:', currentPlayer)
    console.log('selectedMatch:', selectedMatch)
    console.log('isAdmin:', isAdmin)
    
    if (!selectedMatch) {
      console.log('Missing selectedMatch!')
      return
    }
    
    if (!currentPlayer) {
      console.log('Missing currentPlayer!')
      return
    }
    
    if (isEditing && myFeedback) {
      console.log('Updating feedback...')
      updateFeedback.mutate({
        id: myFeedback.id,
        match_id: selectedMatch.id,
        overall_experience: overallExperience || null,
        referee_performance: refereePerformance || null,
        player_behavior: playerBehavior || null,
        other_comments: otherComments || null,
      }, {
        onSuccess: () => {
          console.log('Update success!')
          setIsEditing(false)
        },
        onError: (error) => {
          console.error('Update failed:', error)
        }
      })
    } else {
      console.log('Adding feedback...')
      console.log('Data to send:', {
        match_id: selectedMatch.id,
        player_id: currentPlayer.id,
        team_id: currentPlayer.team_id,
        overall_experience: overallExperience || null,
        referee_performance: refereePerformance || null,
        player_behavior: playerBehavior || null,
        other_comments: otherComments || null,
      })
      addFeedback.mutate({
        match_id: selectedMatch.id,
        player_id: currentPlayer.id,
        team_id: currentPlayer.team_id,
        overall_experience: overallExperience || null,
        referee_performance: refereePerformance || null,
        player_behavior: playerBehavior || null,
        other_comments: otherComments || null,
      }, {
        onSuccess: () => console.log('Add success!'),
        onError: (error) => console.error('Add failed:', error)
      })
    }
  }
  
  // Filter matches to only show completed matches user is eligible for (or all if admin)
  const eligibleMatches = matches?.filter((match: MatchWithTeams) => {
    if (match.status !== 'completed') return false
    if (isAdmin) return true
    if (!currentPlayer) return false
    return currentPlayer.team_id === match.home_team_id || currentPlayer.team_id === match.away_team_id
  })

  if (isLoadingMatches) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (matchesError) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-text-muted">Impossible de charger les matchs</p>
        </div>
      </div>
    )
  }

  if (!selectedMatchId && eligibleMatches && eligibleMatches.length === 0) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="text-center">
          <Trophy className="w-12 h-12 text-text-muted/30 mx-auto mb-4" />
          <p className="text-text-muted">Pas de match terminé pour le moment</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <MessageSquare className="w-8 h-8 text-primary-500" />
            <h1 
              className="text-3xl font-black uppercase tracking-wider" 
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              Avis sur les matchs
            </h1>
          </div>
          <p className="text-text-muted text-sm">Partagez votre expérience après les matchs</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Match Selector Column */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-text-muted px-2">
              Sélectionner un match
            </h2>
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {eligibleMatches?.map((match: MatchWithTeams) => {
                const isSelected = selectedMatchId === match.id
                return (
                  <button
                    key={match.id}
                    onClick={() => handleMatchChange(match.id)}
                    className={clsx(
                      "w-full p-4 rounded-2xl border transition-all duration-300 text-left group",
                      isSelected 
                        ? "bg-primary-500/10 border-primary-500/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                        : "bg-surface-card border-surface-border hover:border-primary-500/20 hover:bg-surface-muted/10"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className={isSelected ? "text-primary-500" : "text-text-muted"} />
                        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
                          {match.scheduled_at ? new Date(match.scheduled_at).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          }) : ''}
                        </span>
                      </div>
                      {isSelected && <ChevronRight size={16} className="text-primary-500" />}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1 flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                          style={{ backgroundColor: match.home_team.color + '20', color: match.home_team.color }}
                        >
                          {match.home_team.name[0]}
                        </div>
                        <span className="text-sm font-bold text-text-primary truncate max-w-[80px]">
                          {match.home_team.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-muted/30">
                        <span className="text-base font-black text-text-primary tabular-nums">
                          {match.home_score}
                        </span>
                        <span className="text-text-muted/40 text-sm">—</span>
                        <span className="text-base font-black text-text-primary tabular-nums">
                          {match.away_score}
                        </span>
                      </div>

                      <div className="flex-1 flex items-center justify-end gap-2">
                        <span className="text-sm font-bold text-text-primary truncate max-w-[80px]">
                          {match.away_team.name}
                        </span>
                        <div 
                          className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                          style={{ backgroundColor: match.away_team.color + '20', color: match.away_team.color }}
                        >
                          {match.away_team.name[0]}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedMatchId ? (
              <div className="bg-surface-card border border-surface-border rounded-2xl p-12 text-center">
                <MessageSquare className="w-16 h-16 text-text-muted/20 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-text-muted mb-2">Aucun match sélectionné</h3>
                <p className="text-sm text-text-muted/70">
                  Choisissez un match dans la liste de gauche pour donner votre avis
                </p>
              </div>
            ) : (
              <>
                {!isEligible ? (
                  <div className="bg-surface-card border border-surface-border rounded-2xl p-8 text-center">
                    <Users className="w-12 h-12 text-text-muted/30 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-text-muted mb-2">Vous n'avez pas participé à ce match</h3>
                    <p className="text-sm text-text-muted/70">
                      Seuls les joueurs ayant participé à ce match peuvent donner leur avis
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Selected Match Header */}
                    {selectedMatch && (
                      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 mb-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-text-muted" />
                            <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
                              {selectedMatch.scheduled_at ? new Date(selectedMatch.scheduled_at).toLocaleDateString('fr-FR', { 
                                weekday: 'long', 
                                day: 'numeric', 
                                month: 'long', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : ''}
                            </span>
                          </div>
                          <div className="px-3 py-1 rounded-full bg-surface-muted/30 border border-surface-border/50">
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-text-muted">Match Terminé</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          {/* Home Team */}
                          <div className="flex flex-col items-center gap-2 flex-1">
                            <div 
                              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl border"
                              style={{ 
                                backgroundColor: selectedMatch.home_team.color + '15', 
                                borderColor: selectedMatch.home_team.color + '30'
                              }}
                            >
                              {selectedMatch.home_team.logo_url ? (
                                <img 
                                  src={selectedMatch.home_team.logo_url} 
                                  alt="" 
                                  className="w-10 h-10 object-contain" 
                                />
                              ) : (
                                <span 
                                  className="text-2xl font-black"
                                  style={{ color: selectedMatch.home_team.color }}
                                >
                                  {selectedMatch.home_team.name[0]}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-text-primary">
                              {selectedMatch.home_team.name}
                            </span>
                          </div>

                          {/* Score */}
                          <div className="flex flex-col items-center px-6">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-12 h-14 rounded-xl bg-surface-muted/30 border border-surface-border/50 flex items-center justify-center shadow-2xl">
                                <span 
                                  className="text-3xl font-black text-text-primary tabular-nums"
                                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                                >
                                  {selectedMatch.home_score}
                                </span>
                              </div>
                              <span className="text-xl font-black text-text-muted/20 italic">—</span>
                              <div className="w-12 h-14 rounded-xl bg-surface-muted/30 border border-surface-border/50 flex items-center justify-center shadow-2xl">
                                <span 
                                  className="text-3xl font-black text-text-primary tabular-nums"
                                  style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                                >
                                  {selectedMatch.away_score}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Away Team */}
                          <div className="flex flex-col items-center gap-2 flex-1">
                            <div 
                              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl border"
                              style={{ 
                                backgroundColor: selectedMatch.away_team.color + '15', 
                                borderColor: selectedMatch.away_team.color + '30'
                              }}
                            >
                              {selectedMatch.away_team.logo_url ? (
                                <img 
                                  src={selectedMatch.away_team.logo_url} 
                                  alt="" 
                                  className="w-10 h-10 object-contain" 
                                />
                              ) : (
                                <span 
                                  className="text-2xl font-black"
                                  style={{ color: selectedMatch.away_team.color }}
                                >
                                  {selectedMatch.away_team.name[0]}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-text-primary">
                              {selectedMatch.away_team.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* My Feedback Section */}
                    {myFeedback && !isEditing ? (
                      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 mb-1">
                            <Trophy size={20} className="text-primary-500" />
                            <h2 className="text-lg font-black uppercase tracking-wider">
                              Votre avis
                            </h2>
                          </div>
                          {isWithinEditWindow(myFeedback.created_at) && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={startEditing}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest text-primary-500 border border-primary-500/30 hover:bg-primary-500/10 transition-all"
                              >
                                <Edit2 size={14} />
                                Modifier
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("Êtes-vous sûr de vouloir supprimer votre avis ?")) {
                                    deleteFeedback.mutate({ id: myFeedback.id, match_id: selectedMatchId! })
                                  }
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest text-red-500 border border-red-500/30 hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 size={14} />
                                Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-text-muted/70 mb-4">
                          Vous pouvez modifier ou supprimer votre avis dans les 24 heures après sa création
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {myFeedback.overall_experience && (
                            <div className="bg-surface rounded-xl p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted mb-2">
                                Déroulement
                              </p>
                              <p className="text-sm text-text-primary">{myFeedback.overall_experience}</p>
                            </div>
                          )}
                          {myFeedback.referee_performance && (
                            <div className="bg-surface rounded-xl p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted mb-2">
                                Arbitrage
                              </p>
                              <p className="text-sm text-text-primary">{myFeedback.referee_performance}</p>
                            </div>
                          )}
                          {myFeedback.player_behavior && (
                            <div className="bg-surface rounded-xl p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted mb-2">
                                Comportements
                              </p>
                              <p className="text-sm text-text-primary">{myFeedback.player_behavior}</p>
                            </div>
                          )}
                          {myFeedback.other_comments && (
                            <div className="bg-surface rounded-xl p-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted mb-2">
                                Autres
                              </p>
                              <p className="text-sm text-text-primary">{myFeedback.other_comments}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-surface-card border border-surface-border rounded-2xl p-6 space-y-5 mb-4">
                        {!currentPlayer ? (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-2">
                            <h3 className="text-lg font-black text-red-400 uppercase tracking-wider">
                              Impossible de soumettre un avis
                            </h3>
                            <p className="text-sm text-red-400/80">
                              Vous n'êtes pas lié à un joueur dans cette saison. Veuillez contacter un administrateur.
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-1">
                              <MessageSquare className="w-5 h-5 text-primary-500" />
                              <h2 className="text-lg font-black uppercase tracking-wider">
                                {isEditing ? 'Modifier votre avis' : 'Donner votre avis'}
                              </h2>
                            </div>
                            {!isEditing && (
                              <p className="text-sm text-text-muted/70 mb-4">
                                Partagez votre expérience de ce match avec nous !
                              </p>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                              <div>
                                <label className="block text-xs font-black uppercase tracking-[0.3em] text-text-muted mb-2">
                                  Déroulement du match
                                </label>
                                <textarea
                                  value={overallExperience}
                                  onChange={(e) => setOverallExperience(e.target.value)}
                                  placeholder="Comment s'est passé le match pour vous et votre équipe ?"
                                  className="w-full bg-surface border border-surface-border rounded-xl p-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none min-h-[100px]"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-black uppercase tracking-[0.3em] text-text-muted mb-2">
                                  Sifflet de l'arbitre
                                </label>
                                <textarea
                                  value={refereePerformance}
                                  onChange={(e) => setRefereePerformance(e.target.value)}
                                  placeholder="Votre avis sur l'arbitrage et les décisions..."
                                  className="w-full bg-surface border border-surface-border rounded-xl p-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none min-h-[100px]"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-black uppercase tracking-[0.3em] text-text-muted mb-2">
                                  Comportements
                                </label>
                                <textarea
                                  value={playerBehavior}
                                  onChange={(e) => setPlayerBehavior(e.target.value)}
                                  placeholder="Commentaires sur le fair-play et les comportements..."
                                  className="w-full bg-surface border border-surface-border rounded-xl p-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none min-h-[100px]"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-black uppercase tracking-[0.3em] text-text-muted mb-2">
                                  Autres commentaires
                                </label>
                                <textarea
                                  value={otherComments}
                                  onChange={(e) => setOtherComments(e.target.value)}
                                  placeholder="Tout ce que vous voulez ajouter..."
                                  className="w-full bg-surface border border-surface-border rounded-xl p-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none min-h-[100px]"
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="submit"
                                  disabled={addFeedback.isPending || updateFeedback.isPending}
                                  className="flex-1 btn-primary text-sm font-black uppercase tracking-widest py-3 flex items-center justify-center gap-2"
                                >
                                  {(addFeedback.isPending || updateFeedback.isPending) ? (
                                    <>
                                      <LoadingSpinner size="sm" />
                                      En cours...
                                    </>
                                  ) : (
                                    <>
                                      <Save size={16} />
                                      {isEditing ? 'Enregistrer les modifications' : 'Soumettre mon avis'}
                                    </>
                                  )}
                                </button>
                                {isEditing && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsEditing(false)
                                      if (myFeedback) {
                                        setOverallExperience(myFeedback.overall_experience || '')
                                        setRefereePerformance(myFeedback.referee_performance || '')
                                        setPlayerBehavior(myFeedback.player_behavior || '')
                                        setOtherComments(myFeedback.other_comments || '')
                                      }
                                    }}
                                    className="px-4 py-3 rounded-xl border border-surface-border text-text-muted hover:bg-surface-muted/10 transition-all text-sm font-bold uppercase tracking-widest"
                                  >
                                    Annuler
                                  </button>
                                )}
                              </div>
                            </form>
                          </>
                        )}
                      </div>
                    )}

                    {/* Existing Feedbacks */}
                    {selectedMatchId && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-5 h-5 text-text-muted" />
                          <h2 className="text-lg font-black uppercase tracking-wider text-text-primary">
                            Avis des autres joueurs
                          </h2>
                        </div>
                        
                        <OtherFeedbacks matchId={selectedMatchId} excludePlayerId={currentPlayer?.id} />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-card border border-surface-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-text-primary">Modifications non enregistrées</h3>
              <button
                onClick={cancelMatchChange}
                className="p-1 rounded-lg hover:bg-surface-muted/10"
              >
                <X size={20} className="text-text-muted" />
              </button>
            </div>
            <p className="text-text-muted mb-6">
              Vous avez des modifications non enregistrées. Si vous changez de match, elles seront perdues.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={cancelMatchChange}
                className="flex-1 px-4 py-2 rounded-xl border border-surface-border text-text-muted hover:bg-surface-muted/10 transition-all text-sm font-bold uppercase tracking-widest"
              >
                Annuler
              </button>
              <button
                onClick={confirmMatchChange}
                className="flex-1 btn-primary text-sm font-bold uppercase tracking-widest"
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OtherFeedbacks({ matchId, excludePlayerId }: { matchId: string; excludePlayerId?: string }) {
  const { data: feedbacks } = useMatchFeedback(matchId)
  const filteredFeedbacks = feedbacks?.filter(f => f.player_id !== excludePlayerId)
  
  if (!filteredFeedbacks || filteredFeedbacks.length === 0) {
    return (
      <div className="bg-surface-card border border-surface-border rounded-2xl p-8 text-center">
        <MessageSquare className="w-10 h-10 text-text-muted/30 mx-auto mb-3" />
        <p className="text-text-muted text-sm">Aucun autre avis pour ce match pour l'instant</p>
      </div>
    )
  }
  
  return (
    <>
      {filteredFeedbacks.map((feedback: MatchFeedbackWithPlayer) => {
        const player = feedback.players as PlayerWithTeam
        const team = player.teams
        
        return (
          <div 
            key={feedback.id} 
            className="bg-surface-card border border-surface-border rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-surface-muted flex items-center justify-center">
                    <User className="w-5 h-5 text-text-muted" />
                  </div>
                  {team && (
                    <div 
                      className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-surface"
                      style={{ backgroundColor: team.color }}
                    />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">
                    {player.first_name} {player.last_name}
                  </p>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.25em]">
                    {team?.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-text-muted">
                <Calendar size={12} />
                <span>{new Date(feedback.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {feedback.overall_experience && (
                <div className="bg-surface rounded-xl p-4">
                  <div className="flex items-center gap-1 mb-2">
                    <Trophy size={12} className="text-primary-500" />
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">
                      Déroulement
                    </p>
                  </div>
                  <p className="text-sm text-text-primary">{feedback.overall_experience}</p>
                </div>
              )}
              {feedback.referee_performance && (
                <div className="bg-surface rounded-xl p-4">
                  <div className="flex items-center gap-1 mb-2">
                    <Star size={12} className="text-primary-500" />
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">
                      Arbitrage
                    </p>
                  </div>
                  <p className="text-sm text-text-primary">{feedback.referee_performance}</p>
                </div>
              )}
              {feedback.player_behavior && (
                <div className="bg-surface rounded-xl p-4">
                  <div className="flex items-center gap-1 mb-2">
                    <Users size={12} className="text-primary-500" />
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">
                      Comportements
                    </p>
                  </div>
                  <p className="text-sm text-text-primary">{feedback.player_behavior}</p>
                </div>
              )}
              {feedback.other_comments && (
                <div className="bg-surface rounded-xl p-4">
                  <div className="flex items-center gap-1 mb-2">
                    <MessageSquare size={12} className="text-primary-500" />
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">
                      Autres
                    </p>
                  </div>
                  <p className="text-sm text-text-primary">{feedback.other_comments}</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}
