import { useState, useEffect } from 'react'
import { Plus, Pencil, Check, X } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTeams } from '@/hooks/useTeams'
import { useMatches, useCreateMatch, useUpdateMatch, type MatchWithTeams } from '@/hooks/useMatches'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { MatchStatus } from '@/types/database'

const STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: 'scheduled', label: 'Programmé' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
]

function ScoreEditor({ match }: { match: MatchWithTeams }) {
  const updateMatch = useUpdateMatch()
  const [editing, setEditing] = useState(false)
  const [homeScore, setHomeScore] = useState(String(match.home_score ?? ''))
  const [awayScore, setAwayScore] = useState(String(match.away_score ?? ''))
  const [status, setStatus] = useState<MatchStatus>(match.status)

  // Sync local state when match data changes (e.g. after cache invalidation)
  useEffect(() => {
    if (!editing) {
      setHomeScore(String(match.home_score ?? ''))
      setAwayScore(String(match.away_score ?? ''))
      setStatus(match.status)
    }
  }, [match.home_score, match.away_score, match.status, editing])

  const home = match.home_team as { id: string; name: string; color: string; logo_url: string | null }
  const away = match.away_team as { id: string; name: string; color: string; logo_url: string | null }

  async function handleSave() {
    await updateMatch.mutateAsync({
      id: match.id,
      home_score: homeScore !== '' ? parseInt(homeScore) : null,
      away_score: awayScore !== '' ? parseInt(awayScore) : null,
      status,
      played_at: status === 'completed' ? new Date().toISOString() : match.played_at,
    })
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: home?.color }} />
        <span className="text-white text-sm truncate">{home?.name}</span>
      </div>

      {editing ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <input
            type="number" value={homeScore} onChange={e => setHomeScore(e.target.value)}
            className="input w-14 text-center py-1 text-sm" min={0}
          />
          <span className="text-slate-500">–</span>
          <input
            type="number" value={awayScore} onChange={e => setAwayScore(e.target.value)}
            className="input w-14 text-center py-1 text-sm" min={0}
          />
          <select value={status} onChange={e => setStatus(e.target.value as MatchStatus)} className="input py-1 text-sm w-32">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={handleSave} disabled={updateMatch.isPending} className="text-primary-400 hover:text-primary-300 p-1">
            {updateMatch.isPending ? <LoadingSpinner size="sm" /> : <Check size={16} />}
          </button>
          <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-slate-300 p-1">
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-white font-bold text-sm">
            {match.home_score !== null ? `${match.home_score} – ${match.away_score}` : '— – —'}
          </span>
          <button onClick={() => setEditing(true)} className="text-slate-500 hover:text-slate-300 p-1">
            <Pencil size={14} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className="text-white text-sm truncate text-right">{away?.name}</span>
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: away?.color }} />
      </div>
    </div>
  )
}

export function AdminSchedulePage() {
  const { data: season } = useActiveSeason()
  const { data: teams } = useTeams(season?.id)
  const { data: matches, isLoading } = useMatches(season?.id)
  const createMatch = useCreateMatch()

  const [showForm, setShowForm] = useState(false)
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [matchday, setMatchday] = useState('1')
  const [scheduledAt, setScheduledAt] = useState('')
  const [venue, setVenue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const matchdays = [...new Set((matches ?? []).map(m => m.matchday))].sort((a, b) => a - b)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!season) return
    if (homeTeam === awayTeam) { setError("L'équipe domicile et extérieure doivent être différentes."); return }
    setError(null)
    try {
      await createMatch.mutateAsync({
        season_id: season.id,
        home_team_id: homeTeam,
        away_team_id: awayTeam,
        matchday: parseInt(matchday),
        scheduled_at: scheduledAt || null,
        venue: venue || null,
      })
      setHomeTeam(''); setAwayTeam(''); setScheduledAt(''); setVenue('')
      setShowForm(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Calendrier
          {season && <span className="text-slate-400 font-normal text-sm ml-2">— {season.name}</span>}
        </h2>
        {season && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Ajouter un match
          </button>
        )}
      </div>

      {showForm && season && (
        <div className="card">
          <h3 className="font-medium text-white mb-4">Nouveau match</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Équipe domicile</label>
                <select value={homeTeam} onChange={e => setHomeTeam(e.target.value)} className="input" required>
                  <option value="">Sélectionner...</option>
                  {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Équipe extérieure</label>
                <select value={awayTeam} onChange={e => setAwayTeam(e.target.value)} className="input" required>
                  <option value="">Sélectionner...</option>
                  {teams?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Journée</label>
                <input type="number" value={matchday} onChange={e => setMatchday(e.target.value)} className="input" min={1} required />
              </div>
              <div>
                <label className="label">Date & heure</label>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Lieu</label>
                <input type="text" value={venue} onChange={e => setVenue(e.target.value)} className="input" placeholder="Terrain A" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createMatch.isPending} className="btn-primary flex items-center gap-2">
                {createMatch.isPending ? <LoadingSpinner size="sm" /> : null}
                Créer
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
      ) : !matches?.length ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">Aucun match programmé.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matchdays.map(day => {
            const dayMatches = (matches ?? []).filter(m => m.matchday === day)
            return (
              <div key={day} className="card">
                <h3 className="font-semibold text-white mb-3 pb-3 border-b border-surface-border">
                  Journée {day}
                </h3>
                <div className="divide-y divide-surface-border/50">
                  {dayMatches.map(match => (
                    <ScoreEditor key={match.id} match={match} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
