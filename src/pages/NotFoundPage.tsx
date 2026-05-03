import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-8xl font-black text-surface-muted mb-4">404</p>
        <h1 className="text-xl font-bold text-white mb-2">Page introuvable</h1>
        <p className="text-slate-500 text-sm mb-6">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <Link to="/" className="btn-primary inline-flex items-center gap-2">
          <Home size={15} />
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
