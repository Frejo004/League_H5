import { BarChart2 } from 'lucide-react'

export function StatsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart2 className="text-primary-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Statistiques</h1>
      </div>
      <div className="card">
        <p className="text-slate-500 text-sm text-center py-8">
          Les statistiques avancées seront disponibles en Phase 3.
        </p>
      </div>
    </div>
  )
}
