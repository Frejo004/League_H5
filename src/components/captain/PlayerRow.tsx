import { useState } from 'react'
import { Pencil, Check, X as XIcon, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { POSITION_LABELS } from '@/components/ui/SharedBadges'
import { useUpdatePlayer } from '@/hooks/usePlayers'
import { InviteButton } from '@/components/ui/InviteButton'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PlayerAvatar } from '@/components/ui/PlayerAvatar'
import type { Player, PlayerPosition } from '@/types/database'

function positionLabel(pos: PlayerPosition | null) {
  return pos ? POSITION_LABELS[pos] : '—'
}

export function PlayerRow({
  player,
  isLast,
  teamColor,
  onViewStats,
  readonly = false,
}: {
  player: Player
  isLast: boolean
  teamColor: string
  onViewStats: (p: Player) => void
  readonly?: boolean
}) {
  const updatePlayer = useUpdatePlayer()
  const [editing, setEditing] = useState(false)
  const [jersey, setJersey] = useState(player.jersey_number?.toString() ?? '')
  const [position, setPosition] = useState<PlayerPosition | ''>(player.position ?? '')
  const [error, setError] = useState('')

  function handleCancel() {
    setJersey(player.jersey_number?.toString() ?? '')
    setPosition(player.position ?? '')
    setError('')
    setEditing(false)
  }

  async function handleSave() {
    setError('')
    const jerseyNum = jersey === '' ? null : parseInt(jersey, 10)
    if (jersey !== '' && (isNaN(jerseyNum!) || jerseyNum! < 1 || jerseyNum! > 99)) {
      setError('Numéro entre 1 et 99')
      return
    }
    try {
      await updatePlayer.mutateAsync({
        id: player.id,
        jersey_number: jerseyNum,
        position: (position as PlayerPosition) || null,
      })
      setEditing(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg.includes('unique') ? 'Ce numéro est déjà pris' : 'Erreur, réessaie')
    }
  }

  return (
    <div className={clsx(!isLast && 'border-b border-surface-border/50')}>
      {/* Ligne principale */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        {/* Avatar cliquable → stats */}
        <button
          onClick={() => onViewStats(player)}
          className="hover:ring-2 hover:ring-white/30 transition-all rounded-full"
          title="Voir les stats"
          aria-label={`Stats de ${player.first_name} ${player.last_name}`}
        >
          <PlayerAvatar
            firstName={player.first_name}
            lastName={player.last_name}
            avatarUrl={player.avatar_url}
            teamColor={teamColor}
            size={28}
          />
        </button>

        {/* Nom + meta — cliquable aussi */}
        <button
          onClick={() => onViewStats(player)}
          className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <p className="text-sm font-medium text-white truncate">
            {player.first_name} {player.last_name}
          </p>
          {!editing && (
            <p className="text-[10px] text-slate-500">
              {player.jersey_number ? `#${player.jersey_number}` : 'Sans numéro'}
              {' · '}
              {positionLabel(player.position)}
            </p>
          )}
        </button>

        {/* Actions droite */}
        <div className="flex items-center gap-1 shrink-0">
          {!editing && (
            <>
              {/* Voir stats */}
              <button
                onClick={() => onViewStats(player)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                title="Voir les statistiques"
                aria-label="Voir les statistiques"
              >
                <ChevronRight size={14} />
              </button>
              {/* Modifier — capitaine seulement */}
              {!readonly && (
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-surface-raised transition-colors"
                  title="Modifier"
                  aria-label="Modifier le joueur"
                >
                  <Pencil size={13} />
                </button>
              )}
              {!readonly && (
                <InviteButton
                  playerId={player.id}
                  playerName={`${player.first_name} ${player.last_name}`}
                  hasAccount={!!player.user_id}
                />
              )}
            </>
          )}
          {editing && (
            <>
              <button
                onClick={handleSave}
                disabled={updatePlayer.isPending}
                className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50"
                title="Enregistrer"
                aria-label="Enregistrer"
              >
                {updatePlayer.isPending ? <LoadingSpinner size="sm" /> : <Check size={14} />}
              </button>
              <button
                onClick={handleCancel}
                disabled={updatePlayer.isPending}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Annuler"
                aria-label="Annuler"
              >
                <XIcon size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Formulaire inline — capitaine seulement */}
      {editing && !readonly && (
        <div className="px-4 pb-3 flex items-center gap-2">
          {/* Numéro */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Numéro</label>
            <input
              type="number"
              min={1}
              max={99}
              value={jersey}
              onChange={e => setJersey(e.target.value)}
              placeholder="—"
              className="w-16 px-2 py-1.5 rounded-lg bg-surface-raised border border-surface-border
                         text-white text-sm text-center focus:outline-none focus:border-primary-500
                         [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                         [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Position */}
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] text-slate-500 uppercase tracking-wider">Position</label>
            <select
              value={position}
              onChange={e => setPosition(e.target.value as PlayerPosition | '')}
              className="w-full px-2 py-1.5 rounded-lg bg-surface-raised border border-surface-border
                         text-white text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">— Non définie —</option>
              {Object.entries(POSITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Erreur */}
          {error && (
            <p className="text-[10px] text-red-400 mt-4 shrink-0">{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
