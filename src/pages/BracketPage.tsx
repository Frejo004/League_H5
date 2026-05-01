import { Shield } from 'lucide-react'

export function BracketPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="text-primary-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Phase Finale</h1>
      </div>
      <div className="card">
        <p className="text-slate-500 text-sm text-center py-8">
          La phase finale sera activée par l'admin en fin de saison.
        </p>
      </div>
    </div>
  )
}
