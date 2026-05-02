import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTeams, useCreateTeam } from '@/hooks/useTeams'
import { usePlayersByTeam, useCreatePlayer, useDeletePlayer } from '@/hooks/usePlayers'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { InviteButton } from '@/components/ui/InviteButton'
import type { PlayerPosition } from '@/types/database'

const POSITIONS: PlayerPosition[] = ['goalkeeper', 'defender', 'midfielder', 'forward']
const POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: 'Gardien',
  defender: 'Défenseur',
  midfielder: 'Milieu',
  forward: 'Attaquant',
}

const TEAM_COLORS = [
  '#16a34a', '#2563eb', '#dc2626', '#d97706', '#7c3aed',
  '#db2777', '#0891b2', '#65a30d', '#ea580c', '#6b7280',
]

function TeamRow({ team, seasonId }: { team: { id: string; name: string; color: string }; seasonId: string }) {
  const [expanded, setExpanded] = useState(false)
  const [showPlayerForm, setShowPlayerForm] = useState(false)
  const { data: players, isLoading } = usePlayersByTeam(expanded ? team.id : undefined)
  const createPlayer = useCreatePlayer()
  const deletePlayer = useDeletePlayer()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [jersey, setJersey] = useState('')
  const [position, setPosition] = useState<PlayerPosition | ''>('')
  const [playerError, setPlayerError] = useState<string | null>(null)

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault()
    setPlayerError(null)
    try {
      await createPlayer.mutateAsync({
        team_id: team.id,
        season_id: seasonId,
        first_name: firstName,
        last_name: lastName,
        jersey_number: jersey ? parseInt(jersey) : null,
        position: position || null,
      })
      setFirstName(''); setLastName(''); setJersey(''); setPosition('')
      setShowPlayerForm(false)
    } catch (err: unknown) {
      setPlayerError(err instanceof Error ? err.message : 'Erreur')
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex-shrink-0"
            style={{ backgroundColor: team.color || '#16a34a' }}
          />
          <span className="font-semibold text-white">{team.name}</span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Joueurs
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-surface-border space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-4"><LoadingSpinner /></div>
          ) : (
            <>
              {(players ?? []).map(p => (
                <div key={p.id} className="flex items-center justify-between text-sm py-1">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-slate-500 font-mono w-6 text-right flex-shrink-0">{p.jersey_number ?? '—'}</span>
                    <span className="text-white">{p.first_name} {p.last_name}</span>
                    {p.position && (
                      <span className="badge bg-surface-border text-slate-400">{POSITION_LABELS[p.position]}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    <InviteButton
                      playerId={p.id}
                      playerName={`${p.first_name} ${p.last_name}`}
                      hasAccount={!!p.user_id}
                    />
                    <button
                      onClick={() => deletePlayer.mutate(p.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      title="Retirer le joueur"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {showPlayerForm ? (
                <form onSubmit={handleAddPlayer} className="space-y-3 pt-2">
                  {playerError && (
                    <p className="text-red-400 text-xs">{playerError}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                      className="input text-sm py-1.5" placeholder="Prénom" required
                    />
                    <input
                      type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                      className="input text-sm py-1.5" placeholder="Nom" required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number" value={jersey} onChange={e => setJersey(e.target.value)}
                      className="input text-sm py-1.5" placeholder="N° maillot" min={1} max={99}
                    />
                    <select
                      value={position} onChange={e => setPosition(e.target.value as PlayerPosition | '')}
                      className="input text-sm py-1.5"
                    >
                      <option value="">Poste (optionnel)</option>
                      {POSITIONS.map(pos => (
                        <option key={pos} value={pos}>{POSITION_LABELS[pos]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={createPlayer.isPending} className="btn-primary text-sm py-1.5 flex items-center gap-1.5">
                      {createPlayer.isPending ? <LoadingSpinner size="sm" /> : null}
                      Ajouter
                    </button>
                    <button type="button" onClick={() => setShowPlayerForm(false)} className="btn-secondary text-sm py-1.5">
                      Annuler
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowPlayerForm(true)}
                  className="flex items-center gap-1.5 text-sm text-primary-400 hover:text-primary-300 transition-colors"
                >
                  <Plus size={14} />
                  Ajouter un joueur
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export function AdminTeamsPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: teams, isLoading: teamsLoading } = useTeams(season?.id)
  const createTeam = useCreateTeam()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(TEAM_COLORS[0])
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!season) return
    setError(null)
    try {
      await createTeam.mutateAsync({ season_id: season.id, name, color })
      setName(''); setColor(TEAM_COLORS[0])
      setShowForm(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    }
  }

  const isLoading = seasonLoading || teamsLoading

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Équipes & Joueurs
          {season && <span className="text-slate-400 font-normal text-sm ml-2">— {season.name}</span>}
        </h2>
        {season && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Nouvelle équipe
          </button>
        )}
      </div>

      {!season && !seasonLoading && (
        <div className="card text-center py-8">
          <p className="text-slate-400">Créez d'abord une saison active dans l'onglet Saisons.</p>
        </div>
      )}

      {showForm && season && (
        <div className="card">
          <h3 className="font-medium text-white mb-4">Créer une équipe</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            <div>
              <label className="label">Nom de l'équipe</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                className="input" placeholder="Les Aigles" required
              />
            </div>
            <div>
              <label className="label">Couleur</label>
              <div className="flex gap-2 flex-wrap">
                {TEAM_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-lg transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-surface-card scale-110' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createTeam.isPending} className="btn-primary flex items-center gap-2">
                {createTeam.isPending ? <LoadingSpinner size="sm" /> : null}
                Créer
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
      ) : season && !teams?.length ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">Aucune équipe pour cette saison.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(teams ?? []).map(team => (
            <TeamRow key={team.id} team={team} seasonId={season!.id} />
          ))}
        </div>
      )}
    </div>
  )
}
