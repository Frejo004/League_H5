import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Crown } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTeams, useCreateTeam, useSetCaptain } from '@/hooks/useTeams'
import { usePlayersByTeam, useCreatePlayer, useDeactivatePlayer } from '@/hooks/usePlayers'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { InviteButton } from '@/components/ui/InviteButton'
import type { PlayerPosition } from '@/types/database'
import clsx from 'clsx'

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
    <div className={clsx(
      "relative overflow-hidden p-4 rounded-xl transition-all duration-300",
      expanded ? "glass-morphism border-primary-500/30 shadow-2xl" : "glass-morphism border-surface-border hover:border-surface-muted hover:shadow-lg"
    )}>
      <div
        className="flex items-center justify-between gap-4 cursor-pointer relative z-10"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center text-white font-black shadow-lg"
            style={{ backgroundColor: team.color, fontFamily: "'Barlow Condensed', sans-serif" }}>
            {team.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <span className="text-text-primary font-black text-sm uppercase tracking-wider block" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {team.name}
            </span>
            {captainPlayerId && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Crown size={12} className="text-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Capitaine assigné</span>
              </div>
            )}
          </div>
        </div>
        <div 
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-text-primary transition-colors bg-surface-raised px-3 py-1.5 rounded-lg border border-surface-border"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {expanded && (
        <div className="mt-5 pt-5 border-t border-surface-border space-y-5 relative z-10">
          {isLoading ? (
            <div className="flex justify-center py-4"><LoadingSpinner /></div>
          ) : (
            <>
              {/* ── Sélecteur de capitaine ── */}
              <div className="space-y-2 bg-surface/50 p-4 rounded-xl border border-surface-border">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Crown size={14} className="text-amber-400" />
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
                      className="input text-sm py-2 flex-1 font-medium bg-surface/50 border-surface-border"
                    >
                      <option value="">— Aucun capitaine —</option>
                      {(players ?? []).map(p => (
                        <option key={p.id} value={p.id}>
                          {p.jersey_number ? `#${p.jersey_number} ` : ''}{p.first_name} {p.last_name}
                          {!p.user_id ? ' (sans compte)' : ' ✓'}
                        </option>
                      ))}
                    </select>
                    {setCaptain.isPending && <LoadingSpinner size="sm" />}
                  </div>
                )}
                {captainPlayerId && !(players ?? []).find(p => p.id === captainPlayerId)?.user_id && (
                  <p className="text-[10px] uppercase font-bold tracking-widest text-amber-500/80 mt-1">
                    ⚠ Attente de création de compte
                  </p>
                )}
              </div>

              {/* ── Liste des joueurs ── */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 px-1">Joueurs</label>
                {(players ?? []).length === 0 ? (
                  <p className="text-xs text-slate-500 italic px-1">Aucun joueur dans cette équipe.</p>
                ) : (
                  <div className="bg-surface/50 rounded-xl border border-surface-border overflow-hidden">
                    {(players ?? []).map(p => (
                      <div key={p.id}
                        className="flex items-center justify-between py-2.5 px-3 border-b border-surface-border last:border-b-0 hover:bg-surface-raised/50 transition-colors shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-text-muted font-black text-sm w-6 text-center shrink-0" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                            {p.jersey_number ?? '—'}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-base font-black text-text-primary uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                                {p.first_name} {p.last_name}
                              </span>
                              {p.id === captainPlayerId && (
                                <Crown size={12} className="text-amber-400 shrink-0" />
                              )}
                            </div>
                            {p.position && (
                                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
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
                            className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors p-1.5 rounded-lg"
                            title="Retirer le joueur"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Formulaire ajout joueur ── */}
              {showPlayerForm ? (
                <form onSubmit={handleAddPlayer} className="space-y-3 pt-3 border-t border-surface-border">
                  {playerError && <p className="text-red-400 text-xs">{playerError}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} 
                      className="input text-sm py-2 bg-surface/50 border-surface-border" placeholder="Prénom" required />
                    <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} 
                      className="input text-sm py-2 bg-surface/50 border-surface-border" placeholder="Nom" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" value={jersey} onChange={e => setJersey(e.target.value)}
                      className="input text-sm py-2 bg-surface/50 border-surface-border" placeholder="N° maillot" min={1} max={99} />
                    <select value={position} onChange={e => setPosition(e.target.value as PlayerPosition | '')}
                      className="input text-sm py-2 bg-surface/50 border-surface-border">
                      <option value="">Poste (optionnel)</option>
                      {POSITIONS.map(pos => ( 
                        <option key={pos} value={pos}>{POSITION_LABELS[pos]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={createPlayer.isPending}
                      className="btn-primary text-xs font-bold uppercase tracking-wider py-2 px-4">
                      {createPlayer.isPending ? <LoadingSpinner size="sm" /> : 'Ajouter'}
                    </button>
                    <button type="button" onClick={() => setShowPlayerForm(false)}
                      className="btn-secondary text-xs font-bold uppercase tracking-wider py-2 px-4 bg-surface-raised border border-surface-border">
                      Annuler
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowPlayerForm(true)}
                  className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-[#FFDF73] hover:bg-amber-600/5 dark:hover:bg-[#FFDF73]/10 transition-colors w-full py-3 rounded-xl border border-dashed border-amber-600/30 dark:border-[#FFDF73]/30 mt-2"
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
        <h2 className="text-base font-semibold text-text-primary">
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
          <h3 className="text-sm font-semibold text-text-primary">Créer une équipe</h3>
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
                    className={`w-7 h-7 rounded transition-all active:scale-95 ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-surface-card scale-110' : ''}`}
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
