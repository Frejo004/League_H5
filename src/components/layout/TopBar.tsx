import { Menu, Bell } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard,
  Trophy,
  Calendar,
  Target,
  Users,
  User,
  BarChart2,
  Settings,
  Shield,
  LogOut,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Accueil' },
  { to: '/standings', icon: Trophy,          label: 'Classement' },
  { to: '/matches',   icon: Calendar,        label: 'Matchs' },
  { to: '/scorers',   icon: Target,          label: 'Buteurs' },
  { to: '/teams',     icon: Users,           label: 'Équipes' },
  { to: '/players',   icon: User,            label: 'Joueurs' },
  { to: '/stats',     icon: BarChart2,       label: 'Stats' },
  { to: '/bracket',   icon: Shield,          label: 'Phase Finale' },
]

export function TopBar() {
  const { profile, isAdmin, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <header className="lg:hidden sticky top-0 z-40 bg-surface-card border-b border-surface-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚽</span>
          <span className="font-bold text-white text-sm">League H5</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-surface-border/50 transition-colors">
            <Bell size={18} />
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-surface-border/50 transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative w-72 bg-surface-card border-r border-surface-border flex flex-col h-full overflow-y-auto">
            <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-border">
              <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">⚽</span>
              </div>
              <div>
                <p className="font-bold text-white text-sm">League H5</p>
                <p className="text-xs text-slate-400">Ligue interne</p>
              </div>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-surface-border/50'
                    )
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
              {isAdmin && (
                <NavLink
                  to="/admin"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-surface-border/50'
                    )
                  }
                >
                  <Settings size={18} />
                  Admin
                </NavLink>
              )}
            </nav>

            <div className="px-3 py-4 border-t border-surface-border">
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-white text-sm font-bold">
                  {profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {profile?.full_name ?? 'Utilisateur'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={16} />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
