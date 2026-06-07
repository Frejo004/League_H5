import { useState } from 'react'
import {
  ArrowRightLeft, Check, X, Plus, Users, User, Trash2,
  AlertCircle, Calendar
} from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTransfers } from '@/hooks/useTransfers'
import { useTeams } from '@/hooks/useTeams'
import { usePlayers } from '@/hooks/usePlayers'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PlayerAvatar } from '@/components/ui/PlayerAvatar'
import { clsx } from 'clsx'
import type { TransferStatus } from '@/types/database'

function StatusBadge({ status }: { status: TransferStatus }) {
  const styles = {
    pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-500 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
    cancelled: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  }

  const labels = {
    pending: 'En attente',
    approved: 'Approuvé',
    rejected: 'Refusé',
    cancelled: 'Annulé',
    completed: 'Terminé',
  }

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border',
      styles[status]
    )}>
      {labels[status]}
    </span>
  )
}

export function AdminTransfersPage() {
  const { data: season } = useActiveSeason()
  const { data: transfers, isLoading: transfersLoading, createTransfer, updateTransfer, deleteTransfer } = useTransfers()
  const { data: teams } = useTeams(season?.id)
  const { data: players } = usePlayers(season?.id)
  const { user } = useAuth()

  const [showForm, setShowForm] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [selectedFromTeam, setSelectedFromTeam] = useState<string | null>(null)
  const [selectedToTeam, setSelectedToTeam] = useState('')
  const [reason, setReason] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlayer || !selectedToTeam || !season?.id) return

    await createTransfer.mutateAsync({
      player_id: selectedPlayer,
      from_team_id: selectedFromTeam,
      to_team_id: selectedToTeam,
      reason: reason || undefined
    })

    setShowForm(false)
    setSelectedPlayer('')
    setSelectedFromTeam(null)
    setSelectedToTeam('')
    setReason('')
  }

  const availablePlayers = players?.filter(p =>
    (selectedFromTeam ? p.team_id === selectedFromTeam : true) &&
    (selectedToTeam ? p.team_id !== selectedToTeam : true)
  )

  if (!season) {
    return (
      <div className="card py-12 text-center opacity-50">
        <AlertCircle size={32} className="mx-auto mb-3 text-text-muted" />
        <p className="text-xs font-bold uppercase tracking-widest">Aucune saison active</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
            <ArrowRightLeft className="text-primary-500" size={20} />
            Gestion des transferts
          </h2>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-widest mt-1">
            Gérez les mouvements de joueurs entre équipes
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest"
        >
          <Plus size={16} />
          Nouveau transfert
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card border-primary-500/30 bg-primary-500/3 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                Joueur
              </label>
              <select
                value={selectedPlayer}
                onChange={(e) => {
                  setSelectedPlayer(e.target.value)
                  const player = players?.find(p => p.id === e.target.value)
                  setSelectedFromTeam(player?.team_id || null)
                }}
                className="input text-sm"
                required
              >
                <option value="">Sélectionner un joueur</option>
                {players?.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} ({p.teams?.name || 'Sans équipe'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                Équipe de destination
              </label>
              <select
                value={selectedToTeam}
                onChange={(e) => setSelectedToTeam(e.target.value)}
                className="input text-sm"
                required
              >
                <option value="">Sélectionner une équipe</option>
                {teams?.map(t => (
                  <option key={t.id} value={t.id} disabled={t.id === selectedFromTeam}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                Raison (optionnel)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input min-h-[80px] text-sm"
                placeholder="Raison du transfert..."
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setSelectedPlayer('')
                  setSelectedFromTeam(null)
                  setSelectedToTeam('')
                  setReason('')
                }}
                className="btn-secondary px-4 py-2 text-xs font-bold uppercase"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={createTransfer.isPending || !selectedPlayer || !selectedToTeam}
                className="btn-primary px-4 py-2 text-xs font-bold uppercase flex items-center gap-2"
              >
                {createTransfer.isPending ? <LoadingSpinner size="sm" /> : <Check size={14} />}
                Créer le transfert
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transfers List */}
      {transfersLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : transfers?.length === 0 ? (
        <div className="card py-12 text-center opacity-50">
          <ArrowRightLeft size={32} className="mx-auto mb-3 text-text-muted" />
          <p className="text-xs font-bold uppercase tracking-widest">Aucun transfert pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transfers?.map((transfer) => (
            <div key={transfer.id} className="card group">
              <div className="flex items-center justify-between gap-4">
                {/* Player Info */}
                <div className="flex items-center gap-4 min-w-0">
                  {transfer.player && (
                    <PlayerAvatar
                      firstName={transfer.player.first_name}
                      lastName={transfer.player.last_name}
                      avatarUrl={transfer.player.avatar_url}
                      teamColor={transfer.player.team?.color}
                      size={40}
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-text-primary truncate">
                        {transfer.player ? `${transfer.player.first_name} ${transfer.player.last_name}` : 'Joueur inconnu'}
                      </p>
                      <StatusBadge status={transfer.status} />
                    </div>
                    {/* Transfer Path */}
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">De:</span>
                        {transfer.from_team ? (
                          <span className="font-semibold text-text-primary">{transfer.from_team.name}</span>
                        ) : (
                          <span className="text-slate-400 italic">Sans équipe</span>
                        )}
                      </div>
                      <ArrowRightLeft size={12} className="text-primary-400" />
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Vers:</span>
                        <span className="font-semibold text-text-primary">{transfer.to_team?.name}</span>
                      </div>
                    </div>
                    {/* Date & Reason */}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-text-muted flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(transfer.created_at).toLocaleDateString('fr-FR')}
                      </span>
                      {transfer.reason && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-surface-border" />
                          <span className="text-[10px] text-text-muted truncate">{transfer.reason}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {transfer.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateTransfer.mutate({ id: transfer.id, status: 'approved' })}
                        className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-colors"
                        title="Approuver"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => updateTransfer.mutate({ id: transfer.id, status: 'rejected' })}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                        title="Refuser"
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}
                  {transfer.status === 'approved' && (
                    <button
                      onClick={() => updateTransfer.mutate({ id: transfer.id, status: 'completed' })}
                      className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 transition-colors text-xs font-bold uppercase"
                    >
                      Terminer
                    </button>
                  )}
                  {(transfer.status === 'pending' || transfer.status === 'cancelled') && (
                    <button
                      onClick={() => {
                        if (confirm('Êtes-vous sûr de vouloir supprimer ce transfert ?')) {
                          deleteTransfer.mutate(transfer.id)
                        }
                      }}
                      className="p-2 rounded-lg bg-surface-raised hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
