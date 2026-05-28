import { Check, X } from 'lucide-react'
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
  // Charge toutes les demandes (pas de filtre saison) pour ne rien manquer
  const { data: spectators, isLoading } = useSpectators()
  const updateStatus = useUpdateSpectatorStatus()

  async function handleUpdate(id: string, status: SpectatorStatus) {
    if (!user) return
    await updateStatus.mutateAsync({ id, status, reviewedBy: user.id })
  }

  const pending  = (spectators ?? []).filter((s): s is SpectatorWithProfile => s.status === 'pending')
  const reviewed = (spectators ?? []).filter((s): s is SpectatorWithProfile => s.status !== 'pending')

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-text-primary uppercase tracking-wider flex items-center gap-3" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        Demandes d'accès spectateurs
        {pending.length > 0 && (
          <span className="text-[10px] font-black uppercase tracking-widest bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(234,179,8,0.3)]">
            {pending.length} en attente
          </span>
        )}
      </h2>

      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
      ) : !spectators?.length ? (
        <div className="card glass-morphism text-center py-12 border border-surface-border">
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Aucune demande d'accès.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-yellow-500/80 uppercase tracking-widest mb-3 px-1">En attente</h3>
              <div className="space-y-3">
                {pending.map(s => {
                  const profile = s.profiles
                  return (
                    <div key={s.id} className="relative overflow-hidden p-4 rounded-xl glass-morphism border border-yellow-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-yellow-500/5 to-transparent">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 text-xl font-black flex-shrink-0 shadow-[0_0_15px_rgba(234,179,8,0.2)]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {(profile.full_name ?? profile.email ?? '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-lg text-text-primary font-black uppercase tracking-wider truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{profile.full_name ?? 'Inconnu'}</p>
                          <p className="text-xs font-medium text-slate-400 truncate">{profile.email}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                            Reçue le {new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(s.requested_at))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                        <button
                          onClick={() => handleUpdate(s.id, 'approved')}
                          disabled={updateStatus.isPending}
                          className="flex-1 sm:flex-none btn-primary flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider py-2 px-4 shadow-[0_0_15px_rgba(200,241,53,0.3)] hover:shadow-[0_0_20px_rgba(200,241,53,0.5)]"
                        >
                          <Check size={14} />
                          Approuver
                        </button>
                        <button
                          onClick={() => handleUpdate(s.id, 'rejected')}
                          disabled={updateStatus.isPending}
                          className="flex-1 sm:flex-none btn-danger flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider py-2 px-4 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]"
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
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 px-1 mt-8">Traités</h3>
              <div className="space-y-3">
                {reviewed.map(s => {
                  const profile = s.profiles
                  return (
                    <div key={s.id} className="relative overflow-hidden p-4 rounded-xl glass-morphism border border-surface-border flex items-center justify-between gap-4 opacity-75 hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-surface/50 border border-surface-border flex items-center justify-center text-slate-500 text-lg font-black flex-shrink-0" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {(profile.full_name ?? profile.email ?? '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base text-text-primary font-black uppercase tracking-wider truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{profile.full_name ?? 'Inconnu'}</p>
                          <p className="text-xs text-slate-400 truncate">{profile.email}</p>
                        </div>
                      </div>
                      <span className={clsx('text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-sm', STATUS_STYLES[s.status])}>
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
