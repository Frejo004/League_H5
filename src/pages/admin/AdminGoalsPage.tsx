import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMatches } from '@/hooks/useMatches'
import { useMatch } from '@/hooks/useMatches'
import { usePlayersByTeam } from '@/hooks/usePlayers'
import { useAddGoal, useDeleteGoal, useAddAssist, useDeleteAssist } from '@/hooks/useGoals'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { MatchWithTeams } from '@/hooks/useMatches'

// ── Goal row editor for a single match ───────────────────────────────────────

function MatchGoalEditor({ match }: { match: MatchWithTeams }) {
  const [expanded, setExpanded] = useState(false)
  const { data: detail, isLoading } = useMatch(expanded ? match.id : undefined)
  const { data: homePlayers } = usePlayersByTeam(expanded ? match.home_team_id : undefined)
  const { data: awayPlayers } = usePlayersByTeam(expanded ? match.away_team_id : undefined)
  const addGoal    = useAddGoal()
  const deleteGoal = useDeleteGoal()
  const addAssist  = useAddAssist()
  const deleteAssist = useDeleteAssist()

  const home = match.home_team as { id: string; name: string; color: string }
  const away = match.away_team as { id: string; name: string; color: string }
  const allPlayers = [...(homePlayers ?? []), ...(awayPlayers ?? [])]

  // Add goal form state
  const [goalPlayer, setGoalPlayer] = useState('')
  const [goalTeam,   setGoalTeam]   = useState(home.id)
  const [goalMinute, setGoalMinute] = useState('')
  const [isOwnGoal,  setIsOwnGoal]  = useState(false)
  const [goalError,  setGoalError]  = useState<string | null>(null)

  // Add assist form state
  const [assistGoalId, setAssistGoalId] = useState('')
  const [assistPlayer, setAssistPlayer] = useState('')
  const [assistError,  setAssistError]  = useState<string | null>(null)

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!goalPlayer) { setGoalError('Sélectionnez un joueur.'); return }
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
      await addAssist.mutateAsync({
        match_id: match.id,
        goal_id: assistGoalId,
        player_id: assistPlayer,
      })
      setAssistGoalId(''); setAssistPlayer('')
    } catch (err: unknown) {
      setAssistError(err instanceof Error ? err.message : 'Erreur')
    }
  }

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

  const goals   = (detail?.goals   ?? []) as unknown as GoalEntry[]
  const assists = (detail?.assists  ?? []) as unknown as AssistEntry[]
  const assistMap = new Map(assists.map(a => [a.goal_id, a]))

  // Goals without assist (eligible for adding one)
  const goalsWithoutAssist = goals.filter(g => !assistMap.has(g.id) && !g.is_own_goal)

  return (
    <div className="card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: home.color }} />
          <span className="text-white font-semibold text-sm truncate">{home.name}</span>
          <span className="text-slate-500 text-sm font-bold">
            {match.home_score !== null ? `${match.home_score} – ${match.away_score}` : '— – —'}
          </span>
          <span className="text-white font-semibold text-sm truncate">{away.name}</span>
          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: away.color }} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
              {/* ── Existing goals ── */}
              {goals.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Buts enregistrés</p>
                  {goals.map(g => {
                    const assist = assistMap.get(g.id)
                    const teamColor = g.team_id === home.id ? home.color : away.color
                    return (
                      <div key={g.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-black/20">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: teamColor }} />
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
                          <button
                            onClick={() => deleteAssist.mutate({ id: assist.id, matchId: match.id })}
                            className="text-slate-600 hover:text-red-400 transition-colors p-0.5"
                            title="Supprimer la passe"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteGoal.mutate({ id: g.id, matchId: match.id })}
                          className="text-slate-600 hover:text-red-400 transition-colors p-0.5"
                          title="Supprimer le but"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* ── Add goal ── */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Ajouter un but</p>
                <form onSubmit={handleAddGoal} className="space-y-2">
                  {goalError && <p className="text-red-400 text-xs">{goalError}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <select value={goalTeam} onChange={e => setGoalTeam(e.target.value)} className="input text-sm py-1.5">
                      <option value={home.id}>{home.name}</option>
                      <option value={away.id}>{away.name}</option>
                    </select>
                    <select value={goalPlayer} onChange={e => setGoalPlayer(e.target.value)} className="input text-sm py-1.5" required>
                      <option value="">Joueur...</option>
                      {allPlayers.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.jersey_number ? `#${p.jersey_number} ` : ''}{p.first_name} {p.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number" value={goalMinute} onChange={e => setGoalMinute(e.target.value)}
                      className="input text-sm py-1.5" placeholder="Minute (optionnel)" min={1} max={120}
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer px-2">
                      <input
                        type="checkbox" checked={isOwnGoal} onChange={e => setIsOwnGoal(e.target.checked)}
                        className="w-4 h-4 accent-primary-500"
                      />
                      Contre son camp
                    </label>
                  </div>
                  <button type="submit" disabled={addGoal.isPending} className="btn-primary text-sm py-1.5 flex items-center gap-1.5">
                    {addGoal.isPending ? <LoadingSpinner size="sm" /> : <Plus size={13} />}
                    Ajouter le but
                  </button>
                </form>
              </div>

              {/* ── Add assist ── */}
              {goalsWithoutAssist.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Ajouter une passe décisive</p>
                  <form onSubmit={handleAddAssist} className="space-y-2">
                    {assistError && <p className="text-red-400 text-xs">{assistError}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      <select value={assistGoalId} onChange={e => setAssistGoalId(e.target.value)} className="input text-sm py-1.5" required>
                        <option value="">But concerné...</option>
                        {goalsWithoutAssist.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.players ? `${g.players.first_name} ${g.players.last_name}` : '—'}
                            {g.minute ? ` (${g.minute}')` : ''}
                          </option>
                        ))}
                      </select>
                      <select value={assistPlayer} onChange={e => setAssistPlayer(e.target.value)} className="input text-sm py-1.5" required>
                        <option value="">Passeur...</option>
                        {allPlayers.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.first_name} {p.last_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" disabled={addAssist.isPending} className="btn-secondary text-sm py-1.5 flex items-center gap-1.5">
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

// ── Main page ─────────────────────────────────────────────────────────────────

export function AdminGoalsPage() {
  const { data: season } = useActiveSeason()
  const { data: matches, isLoading } = useMatches(season?.id)

  const completedMatches = (matches ?? []).filter(m => m.status === 'completed')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Buts & Passes
          {season && <span className="text-slate-400 font-normal text-sm ml-2">— {season.name}</span>}
        </h2>
        <span className="text-xs text-slate-500">{completedMatches.length} match{completedMatches.length !== 1 ? 's' : ''} terminé{completedMatches.length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
      ) : !completedMatches.length ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">Aucun match terminé. Marquez des matchs comme "Terminé" dans l'onglet Calendrier.</p>
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
