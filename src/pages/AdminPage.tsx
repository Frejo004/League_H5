import { Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Navigate } from 'react-router-dom'

export function AdminPage() {
  const { isAdmin } = useAuth()

  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="text-primary-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Administration</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: '👕', title: 'Équipes & Joueurs', desc: 'Gérer les équipes et les rosters', href: '/admin/teams' },
          { icon: '📅', title: 'Calendrier', desc: 'Générer et gérer les matchs', href: '/admin/schedule' },
          { icon: '🏆', title: 'Saisons', desc: 'Créer et gérer les saisons', href: '/admin/seasons' },
          { icon: '🔒', title: 'Verrouillage', desc: 'Verrouiller la ligue', href: '/admin/settings' },
          { icon: '👁️', title: 'Spectateurs', desc: 'Approuver les demandes d\'accès', href: '/admin/spectators' },
          { icon: '⚙️', title: 'Paramètres', desc: 'Configuration générale', href: '/admin/settings' },
        ].map(item => (
          <div key={item.title} className="card hover:border-primary-600/50 transition-colors cursor-pointer">
            <span className="text-3xl mb-3 block">{item.icon}</span>
            <h3 className="font-semibold text-white mb-1">{item.title}</h3>
            <p className="text-sm text-slate-400">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
