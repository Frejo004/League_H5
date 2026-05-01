import { Trophy } from 'lucide-react'

export function StandingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="text-primary-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Classement</h1>
      </div>
      <div className="card">
        <p className="text-slate-500 text-sm text-center py-8">
          Le classement sera disponible une fois les équipes et matchs configurés.
        </p>
      </div>
    </div>
  )
}
