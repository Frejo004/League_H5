import { Clock, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function PendingApprovalModal() {
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        <div className="card text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Clock size={32} className="text-amber-400" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">
              En attente d'approbation
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Votre demande d'accès en tant que spectateur est en cours de traitement.
              Un administrateur doit approuver votre compte avant que vous puissiez accéder à l'application.
            </p>
          </div>

          {/* Info box */}
          <div className="bg-surface-raised border border-surface-border rounded-lg p-4 text-left">
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-300">Que faire ?</strong><br />
              Contactez un administrateur de la ligue pour accélérer le processus d'approbation.
              Vous recevrez une notification par email une fois votre compte activé.
            </p>
          </div>

          {/* Sign out button */}
          <button
            onClick={signOut}
            className="btn btn-secondary w-full flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}
