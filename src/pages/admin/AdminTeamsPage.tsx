import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Crown } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTeams, useCreateTeam, useSetCaptain } from '@/hooks/useTeams'
import { usePlayersByTeam, useCreatePlayer, useDeactivatePlayer } from '@/hooks/usePlayers'
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

function TeamRow({
  team,
  seasonId,
}: {
  team: { id: string; name: string; color: string; captain_id: string | null }
  seasonId: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [showPlayerForm, setShowPlayerForm] = useState(false)
  // Stocke localement le player_id désigné comme capitaine
  // (indépendant de captain_id qui est un user_id)
  const [designatedCaptainPlayerId, setDesignatedCaptainPlayerId] = useState<string | null>(null)

  const { data: players, isLoading } = usePlayersByTeam(expanded ? team.id : undefined)
  const createPlayer = useCreatePlayer()
  const deactivatePlayer = useDeactivatePlayer()
  const setCaptain = useSetCaptain()

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

  async function handleSetCaptain(playerId: string | null) {
    // Trouve le user_id du joueur s'il a un compte
    const player = (players ?? []).find(p => p.id === playerId)
    const captainUserId = player?.user_id ?? null

    setDesignatedCaptainPlayerId(playerId)

    await setCaptain.mutateAsync({
      teamId: team.id,
      captainPlayerId: playerId,
      captainUserId,
      seasonId,
    })
  }

  // Le capitaine affiché : soit via user_id (captain_id), soit via désignation locale
  const captainPlayerId = designatedCaptainPlayerId
    ?? (players ?? []).find(p => p.user_id === team.captain_id)?.id
    ?? null

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg shrink-0" style={{ backgroundColor: team.color }} />
          <div>
            <span className="font-semibold text-white text-sm">{team.name}</span>
            {(team.captain_id || designatedCaptainPlayerId) && (
              <div className="flex items-center gap-1 mt-0.5">
                <Crown size={10} className="text-amber-400" />
                <span className="text-[10px] text-amber-400">Capitaine assigné</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Gérer
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-surface-border space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-4"><LoadingSpinner /></div>
          ) : (
            <>
              {/* ── Sélecteur de capitaine ── */}
              <div className="space-y-1.5">
                <label className="label flex items-center gap-1.5">
                  <Crown size={11} className="text-amber-400" />
                  Capitaine de l'équipe
                </label>
                {(players ?? []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Aucun joueur dans cette équipe.
                  </p>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={captainPlayerId ?? ''}
                      onChange={e => handleSetCaptain(e.target.value || null)}
                      disabled={setCaptain.isPending}
                      className="input text-sm py-1.5 flex-1"
                    >
                      <option value="">— Aucun capitaine —</option>
                      {(players ?? []).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.first_name} {p.last_name}
                          {!p.user_id ? ' (sans compte)' : ' ✓'}
                        </option>
                      ))}
                    </select>
                    {setCaptain.isPending && <LoadingSpinner size="sm" />}
                  </div>
                )}
                {captainPlayerId && !(players ?? []).find(p => p.id === captainPlayerId)?.user_id && (
                  <p className="text-xs text-amber-500/70">
                    ⚠ Ce joueur n'a pas encore de compte. Son rôle sera mis à jour quand il s'inscrira.
                  </p>
                )}
              </div>

              {/* ── Liste des joueurs ── */}
              <div className="space-y-1">
                <label className="label">Joueurs</label>
                {(players ?? []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Aucun joueur dans cette équipe.</p>
                ) : (
                  (players ?? []).map(p => (
                    <div key={p.id}
                      className="flex items-center justify-between py-1.5 border-b border-surface-border/40 last:border-b-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-slate-600 font-mono text-xs w-5 text-right shrink-0">
                          {p.jersey_number ?? '—'}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm text-white">
                              {p.first_name} {p.last_name}
                            </span>
                            {p.id === captainPlayerId && (
                              <Crown size={11} className="text-amber-400 shrink-0" />
                            )}
                          </div>
                          {p.position && (
                            <span className="text-[10px] text-slate-500">
                              {POSITION_LABELS[p.position]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-2">
                        <InviteButton
                          playerId={p.id}
                          playerName={`${p.first_name} ${p.last_name}`}
                          hasAccount={!!p.user_id}
                        />
                        <button
                          onClick={() => deactivatePlayer.mutate(p.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors p-1"
                          title="Retirer le joueur"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ── Formulaire ajout joueur ── */}
              {showPlayerForm ? (
                <form onSubmit={handleAddPlayer} className="space-y-2 pt-1">
                  {playerError && <p className="text-red-400 text-xs">{playerError}</p>}
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                      className="input text-sm py-1.5" placeholder="Prénom" required />
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                      className="input text-sm py-1.5" placeholder="Nom" required />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={jersey} onChange={e => setJersey(e.target.value)}
                      className="input text-sm py-1.5" placeholder="N° maillot" min={1} max={99} />
                    <select value={position} onChange={e => setPosition(e.target.value as PlayerPosition | '')}
                      className="input text-sm py-1.5">
                      <option value="">Poste (optionnel)</option>
                      {POSITIONS.map(pos => (
                        <option key={pos} value={pos}>{POSITION_LABELS[pos]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={createPlayer.isPending}
                      className="btn-primary text-sm py-1.5 flex items-center gap-1.5">
                      {createPlayer.isPending ? <LoadingSpinner size="sm" /> : null}
                      Ajouter
                    </button>
                    <button type="button" onClick={() => setShowPlayerForm(false)}
                      className="btn-secondary text-sm py-1.5">
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">
          Équipes & Joueurs
          {season && <span className="text-slate-500 font-normal text-sm ml-2">— {season.name}</span>}
        </h2>
        {season && (
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-1.5">
            <Plus size={14} />
            Nouvelle équipe
          </button>
        )}
      </div>

      {!season && !seasonLoading && (
        <div className="card text-center py-8">
          <p className="text-slate-400 text-sm">Créez d'abord une saison active dans l'onglet Saisons.</p>
        </div>
      )}

      {showForm && season && (
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-white">Créer une équipe</h3>
          <form onSubmit={handleCreate} className="space-y-3">
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <div>
              <label className="label">Nom de l'équipe</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="input" placeholder="Les Aigles" required />
            </div>
            <div>
              <label className="label">Couleur</label>
              <div className="flex gap-2 flex-wrap">
                {TEAM_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded transition-all ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-card scale-110' : ''}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={createTeam.isPending} className="btn-primary flex items-center gap-1.5">
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
        <div className="card text-center py-8">
          <p className="text-slate-400 text-sm">Aucune équipe pour cette saison.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(teams ?? []).map(team => (
            <TeamRow
              key={team.id}
              team={team as { id: string; name: string; color: string; captain_id: string | null }}
              seasonId={season!.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}
