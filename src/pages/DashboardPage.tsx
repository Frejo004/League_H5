import { LayoutDashboard } from 'lucide-react'

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="text-primary-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Matchs joués', value: '—', icon: '⚽' },
          { label: 'Équipes', value: '—', icon: '👕' },
          { label: 'Buteurs', value: '—', icon: '🎯' },
          { label: 'Journée en cours', value: '—', icon: '📅' },
        ].map(stat => (
          <div key={stat.label} className="card flex items-center gap-4">
            <span className="text-3xl">{stat.icon}</span>
            <div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-sm text-slate-400">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-semibold text-white mb-3">Prochain match</h2>
          <p className="text-slate-500 text-sm">Aucun match programmé</p>
        </div>
        <div className="card">
          <h2 className="font-semibold text-white mb-3">Derniers résultats</h2>
          <p className="text-slate-500 text-sm">Aucun résultat disponible</p>
        </div>
      </div>
    </div>
  )
}
