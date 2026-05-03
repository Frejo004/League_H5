import { Check, X } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useSpectators, useUpdateSpectatorStatus, type SpectatorWithProfile } from '@/hooks/useSpectators'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { SpectatorStatus } from '@/types/database'
import { clsx } from 'clsx'

const STATUS_STYLES: Record<SpectatorStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  approved: 'bg-primary-600/20 text-primary-400 border border-primary-600/30',
  rejected: 'bg-red-500/20 text-red-400 border border-red-500/30',
}

const STATUS_LABELS: Record<SpectatorStatus, string> = {
  pending: 'En attente',
  approved: 'Approuvé',
  rejected: 'Refusé',
}

export function AdminSpectatorsPage() {
  const { user } = useAuth()
  const { data: season } = useActiveSeason()
  const { data: spectators, isLoading } = useSpectators(season?.id)
  const updateStatus = useUpdateSpectatorStatus()

  async function handleUpdate(id: string, status: SpectatorStatus) {
    if (!user) return
    await updateStatus.mutateAsync({ id, status, reviewedBy: user.id })
  }

  const pending = (spectators ?? []).filter((s): s is SpectatorWithProfile => s.status === 'pending')
  const reviewed = (spectators ?? []).filter((s): s is SpectatorWithProfile => s.status !== 'pending')

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">
        Demandes d'accès spectateurs
        {pending.length > 0 && (
          <span className="ml-2 badge bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            {pending.length} en attente
          </span>
        )}
      </h2>

      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
      ) : !spectators?.length ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">Aucune demande d'accès.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">En attente</h3>
              <div className="space-y-2">
                {pending.map(s => {
                  const profile = s.profiles
                  return (
                    <div key={s.id} className="card flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-surface-border flex items-center justify-center text-slate-300 text-sm font-bold flex-shrink-0">
                          {(profile.full_name ?? profile.email ?? '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">{profile.full_name ?? 'Inconnu'}</p>
                          <p className="text-sm text-slate-400 truncate">{profile.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleUpdate(s.id, 'approved')}
                          disabled={updateStatus.isPending}
                          className="btn-primary flex items-center gap-1.5 text-sm py-1.5"
                        >
                          <Check size={14} />
                          Approuver
                        </button>
                        <button
                          onClick={() => handleUpdate(s.id, 'rejected')}
                          disabled={updateStatus.isPending}
                          className="btn-danger flex items-center gap-1.5 text-sm py-1.5"
                        >
                          <X size={14} />
                          Refuser
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {reviewed.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Traités</h3>
              <div className="space-y-2">
                {reviewed.map(s => {
                  const profile = s.profiles
                  return (
                    <div key={s.id} className="card flex items-center justify-between gap-4 opacity-75">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-surface-border flex items-center justify-center text-slate-300 text-sm font-bold flex-shrink-0">
                          {(profile.full_name ?? profile.email ?? '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-medium truncate">{profile.full_name ?? 'Inconnu'}</p>
                          <p className="text-sm text-slate-400 truncate">{profile.email}</p>
                        </div>
                      </div>
                      <span className={clsx('badge', STATUS_STYLES[s.status])}>
                        {STATUS_LABELS[s.status]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
