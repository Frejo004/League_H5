import { useState } from 'react'
import { Clock, CheckCircle2, XCircle, Send, LogOut, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import { useAuth } from '@/hooks/useAuth'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMySpectatorRequest, useRequestSpectatorAccess } from '@/hooks/useSpectators'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

export function PendingApprovalModal() {
  const { user, profile, signOut } = useAuth()
  const { data: season } = useActiveSeason()
  const { data: request, isLoading } = useMySpectatorRequest(user?.id, season?.id)
  const requestAccess = useRequestSpectatorAccess()
  const [sent, setSent] = useState(false)

  async function handleSendRequest() {
    if (!user?.id || !season?.id) return
    await requestAccess.mutateAsync({ userId: user.id, seasonId: season.id })
    setSent(true)
  }

  // Pas encore de saison active — cas rare
  if (!season && !isLoading) {
    return (
      <ModalShell onSignOut={signOut}>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-500/15 border border-slate-500/30
                          flex items-center justify-center">
            <Clock size={24} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Aucune saison active</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            La ligue n'a pas encore de saison active. Revenez plus tard.
          </p>
        </div>
      </ModalShell>
    )
  }

  // Chargement
  if (isLoading) {
    return (
      <ModalShell onSignOut={signOut}>
        <div className="flex justify-center py-6">
          <LoadingSpinner size="lg" />
        </div>
      </ModalShell>
    )
  }

  // Refusé
  if (request?.status === 'rejected') {
    return (
      <ModalShell onSignOut={signOut}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/15 border border-red-500/30
                          flex items-center justify-center">
            <XCircle size={24} className="text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Accès refusé</h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Votre demande d'accès a été refusée par l'administrateur.
              Contactez-le directement pour plus d'informations.
            </p>
          </div>
          <button
            onClick={handleSendRequest}
            disabled={requestAccess.isPending}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            {requestAccess.isPending
              ? <LoadingSpinner size="sm" />
              : <><RefreshCw size={14} /> Renvoyer une demande</>
            }
          </button>
        </div>
      </ModalShell>
    )
  }

  // En attente (demande déjà envoyée)
  if (request?.status === 'pending') {
    return (
      <ModalShell onSignOut={signOut}>
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Icône animée */}
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full bg-amber-500/10 border border-amber-500/20
                            animate-ping opacity-40" />
            <div className="relative w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30
                            flex items-center justify-center">
              <Clock size={26} className="text-amber-400" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">Demande envoyée</h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed max-w-xs">
              Votre demande d'accès est en cours de traitement.
              L'administrateur va l'examiner prochainement.
            </p>
          </div>

          {/* Étapes */}
          <div className="w-full space-y-2 mt-1">
            <Step done label="Compte créé" />
            <Step done label="Demande envoyée" />
            <Step label="Approbation admin" pending />
            <Step label="Accès accordé" />
          </div>

          <p className="text-xs text-slate-600 mt-1">
            Cette page se met à jour automatiquement.
          </p>
        </div>
      </ModalShell>
    )
  }

  // Pas encore de demande — premier affichage après inscription
  return (
    <ModalShell onSignOut={signOut}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-primary-500/15 border border-primary-500/30
                        flex items-center justify-center">
          <Send size={22} className="text-primary-400" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-white">Bienvenue, {profile?.full_name?.split(' ')[0] ?? 'vous'} !</h2>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed max-w-xs">
            Votre compte a été créé. Pour accéder à la ligue, envoyez une demande d'accès à l'administrateur.
          </p>
        </div>

        <button
          onClick={handleSendRequest}
          disabled={requestAccess.isPending || sent}
          className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
        >
          {requestAccess.isPending
            ? <LoadingSpinner size="sm" />
            : sent
              ? <><CheckCircle2 size={15} /> Demande envoyée !</>
              : <><Send size={15} /> Envoyer la demande d'accès</>
          }
        </button>

        <p className="text-xs text-slate-600">
          L'admin recevra une notification et pourra approuver votre accès.
        </p>
      </div>
    </ModalShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────────────────────────────────────

function ModalShell({ children, onSignOut }: { children: React.ReactNode; onSignOut: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: '#0D1117' }}>
      {/* Glow de fond */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(37,99,235,0.08) 0%, transparent 70%)',
        }}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl p-8 animate-scale-in"
        style={{
          backgroundColor: '#161B22',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src="/logo-h5.png" alt="League H5" className="w-10 h-10 object-contain" />
        </div>

        {children}

        {/* Déconnexion */}
        <button
          onClick={onSignOut}
          className="mt-6 w-full flex items-center justify-center gap-2 text-xs text-slate-600
                     hover:text-slate-400 transition-colors py-1"
        >
          <LogOut size={12} />
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

function Step({ label, done, pending }: { label: string; done?: boolean; pending?: boolean }) {
  return (
    <div className={clsx(
      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm',
      done    ? 'bg-green-500/8 text-green-400'
      : pending ? 'bg-amber-500/8 text-amber-400'
      : 'text-slate-600'
    )}>
      <div className={clsx(
        'w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold',
        done    ? 'bg-green-500/20 border border-green-500/40'
        : pending ? 'bg-amber-500/20 border border-amber-500/40 animate-pulse'
        : 'bg-white/5 border border-white/10'
      )}>
        {done ? <CheckCircle2 size={11} /> : pending ? '…' : ''}
      </div>
      <span className="font-medium">{label}</span>
    </div>
  )
}
