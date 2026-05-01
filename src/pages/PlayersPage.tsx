import { User } from 'lucide-react'

export function PlayersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <User className="text-primary-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Joueurs</h1>
      </div>
      <div className="card">
        <p className="text-slate-500 text-sm text-center py-8">
          Aucun joueur enregistré pour le moment.
        </p>
      </div>
    </div>
  )
}
