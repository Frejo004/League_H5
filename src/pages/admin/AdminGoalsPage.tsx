import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMatches, useMatch } from '@/hooks/useMatches'
import { usePlayersByTeam } from '@/hooks/usePlayers'
import { useAddGoal, useDeleteGoal, useAddAssist, useDeleteAssist } from '@/hooks/useGoals'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { MatchWithTeams } from '@/hooks/useMatches'

interface GoalEntry {
  id: string
  minute: number | null
  is_own_goal: boolean
  team_id: string
  players: { id: string; first_name: string; last_name: string } | null
}
interface AssistEntry {
  id: string
  goal_id: string
  players: { id: string; first_name: string; last_name: string } | null
}

function MatchGoalEditor({ match }: { match: MatchWithTeams }) {
  const [expanded, setExpanded] = useState(false)
  const { data: detail, isLoading } = useMatch(expanded ? match.id : undefined)
  const { data: homePlayers } = usePlayersByTeam(expanded ? match.home_team_id : undefined)
  const { data: awayPlayers } = usePlayersByTeam(expanded ? match.away_team_id : undefined)
  const addGoal      = useAddGoal()
  const deleteGoal   = useDeleteGoal()
  const addAssist    = useAddAssist()
  const deleteAssist = useDeleteAssist()

  const home = match.home_team as { id: string; name: string; color: string }
  const away = match.away_team as { id: string; name: string; color: string }

  // ── Form state ──────────────────────────────────────────────────────────────
  const [goalTeam,   setGoalTeam]   = useState(home.id)
  const [goalPlayer, setGoalPlayer] = useState('')
  const [goalMinute, setGoalMinute] = useState('')
  const [isOwnGoal,  setIsOwnGoal]  = useState(false)
  const [goalError,  setGoalError]  = useState<string | null>(null)

  const [assistGoalId, setAssistGoalId] = useState('')
  const [assistPlayer, setAssistPlayer] = useState('')
  const [assistError,  setAssistError]  = useState<string | null>(null)

  // Reset player selection when team or own-goal changes
  useEffect(() => { setGoalPlayer('') }, [goalTeam, isOwnGoal])

  // ── Derived data ────────────────────────────────────────────────────────────
  const goals   = (detail?.goals   ?? []) as unknown as GoalEntry[]
  const assists = (detail?.assists  ?? []) as unknown as AssistEntry[]
  const assistMap = new Map(assists.map(a => [a.goal_id, a]))

  // Buts par équipe déjà enregistrés
  const homeGoalsCount = goals.filter(g => g.team_id === home.id && !g.is_own_goal).length
                       + goals.filter(g => g.team_id === away.id &&  g.is_own_goal).length
  const awayGoalsCount = goals.filter(g => g.team_id === away.id && !g.is_own_goal).length
                       + goals.filter(g => g.team_id === home.id &&  g.is_own_goal).length

  const homeScoreMax = match.home_score ?? 0
  const awayScoreMax = match.away_score ?? 0

  // Limite atteinte pour l'équipe sélectionnée
  const scoringTeamIsHome = goalTeam === home.id
  const currentCount = scoringTeamIsHome ? homeGoalsCount : awayGoalsCount
  const maxCount     = scoringTeamIsHome ? homeScoreMax   : awayScoreMax
  const limitReached = currentCount >= maxCount

  // Joueurs éligibles selon l'équipe et le type de but
  // - But normal  → joueurs de l'équipe qui marque
  // - CSC         → joueurs de l'équipe ADVERSE (c'est eux qui mettent le but dans leur propre cage)
  const scoringTeamPlayers = goalTeam === home.id ? (homePlayers ?? []) : (awayPlayers ?? [])
  const ownGoalTeamPlayers = goalTeam === home.id ? (awayPlayers ?? []) : (homePlayers ?? [])
  const eligiblePlayers    = isOwnGoal ? ownGoalTeamPlayers : scoringTeamPlayers

  // Joueurs éligibles pour la passe (même équipe que le buteur, sauf le buteur lui-même)
  const goalsWithoutAssist = goals.filter(g => !assistMap.has(g.id) && !g.is_own_goal)

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!goalPlayer) { setGoalError('Sélectionnez un joueur.'); return }
    if (limitReached) { setGoalError(`Le score de cette équipe est déjà atteint (${maxCount} but${maxCount > 1 ? 's' : ''}).`); return }
    setGoalError(null)
    try {
      await addGoal.mutateAsync({
        match_id: match.id,
        player_id: goalPlayer,
        team_id: goalTeam,
        minute: goalMinute ? parseInt(goalMinute) : null,
        is_own_goal: isOwnGoal,
      })
      setGoalPlayer(''); setGoalMinute(''); setIsOwnGoal(false)
    } catch (err: unknown) {
      setGoalError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  async function handleAddAssist(e: React.FormEvent) {
    e.preventDefault()
    if (!assistGoalId || !assistPlayer) { setAssistError('Sélectionnez un but et un joueur.'); return }
    setAssistError(null)
    try {
      await addAssist.mutateAsync({ match_id: match.id, goal_id: assistGoalId, player_id: assistPlayer })
      setAssistGoalId(''); setAssistPlayer('')
    } catch (err: unknown) {
      setAssistError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  // Joueurs de l'équipe d'un but donné (pour la passe)
  function getTeamPlayersForGoal(goalId: string) {
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return []
    return goal.team_id === home.id ? (homePlayers ?? []) : (awayPlayers ?? [])
  }

  return (
    <div className="card">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: home.color }} />
          <span className="text-white font-semibold text-sm truncate">{home.name}</span>
          <span className="text-slate-400 text-sm font-bold tabular-nums">
            {match.home_score ?? '—'} – {match.away_score ?? '—'}
          </span>
          <span className="text-white font-semibold text-sm truncate">{away.name}</span>
          <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: away.color }} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Progression buts enregistrés */}
          <span className="text-xs text-slate-600">
            {goals.length}/{(match.home_score ?? 0) + (match.away_score ?? 0)} buts
          </span>
          <span className="text-xs text-slate-500">J{match.matchday}</span>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-surface-border space-y-5">
          {isLoading ? (
            <div className="flex justify-center py-4"><LoadingSpinner /></div>
          ) : (
            <>
              {/* ── Buts enregistrés ── */}
              {goals.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    Buts enregistrés ({goals.length}/{(match.home_score ?? 0) + (match.away_score ?? 0)})
                  </p>
                  {goals.map(g => {
                    const assist = assistMap.get(g.id)
                    const teamColor = g.team_id === home.id ? home.color : away.color
                    return (
                      <div key={g.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-surface-raised">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: teamColor }} />
                        <span className="text-white text-sm flex-1">
                          {g.is_own_goal ? '⚽ CSC — ' : '⚽ '}
                          {g.players ? `${g.players.first_name} ${g.players.last_name}` : '—'}
                          {g.minute ? ` (${g.minute}')` : ''}
                          {assist?.players && (
                            <span className="text-slate-500 text-xs ml-2">
                              Passe : {assist.players.first_name} {assist.players.last_name}
                            </span>
                          )}
                        </span>
                        {assist && (
                          <button onClick={() => deleteAssist.mutate({ id: assist.id, matchId: match.id })}
                            className="text-slate-600 hover:text-red-400 transition-colors p-0.5" title="Supprimer la passe">
                            <Trash2 size={11} />
                          </button>
                        )}
                        <button onClick={() => deleteGoal.mutate({ id: g.id, matchId: match.id })}
                          className="text-slate-600 hover:text-red-400 transition-colors p-0.5" title="Supprimer le but">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── Ajouter un but ── */}
              {goals.length < (match.home_score ?? 0) + (match.away_score ?? 0) ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Ajouter un but</p>
                  <form onSubmit={handleAddGoal} className="space-y-2">
                    {goalError && <p className="text-red-400 text-xs">{goalError}</p>}

                    <div className="grid grid-cols-2 gap-2">
                      {/* Équipe qui marque */}
                      <div>
                        <label className="label">Équipe qui marque</label>
                        <select value={goalTeam} onChange={e => setGoalTeam(e.target.value)}
                          className="input text-sm py-1.5">
                          <option value={home.id}>
                            {home.name} ({homeGoalsCount}/{homeScoreMax})
                          </option>
                          <option value={away.id}>
                            {away.name} ({awayGoalsCount}/{awayScoreMax})
                          </option>
                        </select>
                      </div>

                      {/* Joueur */}
                      <div>
                        <label className="label">
                          {isOwnGoal ? 'Joueur (camp adverse)' : 'Buteur'}
                        </label>
                        <select value={goalPlayer} onChange={e => setGoalPlayer(e.target.value)}
                          className="input text-sm py-1.5" required>
                          <option value="">Sélectionner...</option>
                          {eligiblePlayers.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.jersey_number ? `#${p.jersey_number} ` : ''}{p.first_name} {p.last_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" value={goalMinute} onChange={e => setGoalMinute(e.target.value)}
                        className="input text-sm py-1.5" placeholder="Minute (optionnel)" min={1} max={120} />
                      <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer px-2">
                        <input type="checkbox" checked={isOwnGoal} onChange={e => setIsOwnGoal(e.target.checked)}
                          className="w-4 h-4 accent-primary-500" />
                        Contre son camp (CSC)
                      </label>
                    </div>

                    {limitReached && (
                      <p className="text-amber-500 text-xs">
                        ⚠ Score atteint pour cette équipe ({maxCount}/{maxCount}). Supprimez un but existant pour en ajouter un autre.
                      </p>
                    )}

                    <button type="submit" disabled={addGoal.isPending || limitReached}
                      className="btn-primary text-sm py-1.5 flex items-center gap-1.5">
                      {addGoal.isPending ? <LoadingSpinner size="sm" /> : <Plus size={13} />}
                      Ajouter le but
                    </button>
                  </form>
                </div>
              ) : (
                <p className="text-xs text-green-400 font-medium">
                  ✓ Tous les buts ont été enregistrés ({goals.length}/{(match.home_score ?? 0) + (match.away_score ?? 0)})
                </p>
              )}

              {/* ── Ajouter une passe ── */}
              {goalsWithoutAssist.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Ajouter une passe décisive</p>
                  <form onSubmit={handleAddAssist} className="space-y-2">
                    {assistError && <p className="text-red-400 text-xs">{assistError}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="label">But concerné</label>
                        <select value={assistGoalId} onChange={e => setAssistGoalId(e.target.value)}
                          className="input text-sm py-1.5" required>
                          <option value="">Sélectionner...</option>
                          {goalsWithoutAssist.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.players ? `${g.players.first_name} ${g.players.last_name}` : '—'}
                              {g.minute ? ` (${g.minute}')` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Passeur (même équipe)</label>
                        <select value={assistPlayer} onChange={e => setAssistPlayer(e.target.value)}
                          className="input text-sm py-1.5" required>
                          <option value="">Sélectionner...</option>
                          {getTeamPlayersForGoal(assistGoalId).map(p => (
                            <option key={p.id} value={p.id}>
                              {p.first_name} {p.last_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button type="submit" disabled={addAssist.isPending}
                      className="btn-secondary text-sm py-1.5 flex items-center gap-1.5">
                      {addAssist.isPending ? <LoadingSpinner size="sm" /> : <Plus size={13} />}
                      Ajouter la passe
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function AdminGoalsPage() {
  const { data: season } = useActiveSeason()
  const { data: matches, isLoading } = useMatches(season?.id)

  const completedMatches = (matches ?? []).filter(m => m.status === 'completed')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">
          Buts & Passes
          {season && <span className="text-slate-500 font-normal text-sm ml-2">— {season.name}</span>}
        </h2>
        <span className="text-xs text-slate-500">
          {completedMatches.length} match{completedMatches.length !== 1 ? 's' : ''} terminé{completedMatches.length !== 1 ? 's' : ''}
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
      ) : !completedMatches.length ? (
        <div className="card text-center py-8">
          <p className="text-slate-400 text-sm">
            Aucun match terminé. Marquez des matchs comme "Terminé" dans l'onglet Calendrier.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {completedMatches.map(match => (
            <MatchGoalEditor key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  )
}
