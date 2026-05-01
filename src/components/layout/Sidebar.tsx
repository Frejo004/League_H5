import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Trophy,
  Calendar,
  Target,
  Users,
  User,
  BarChart2,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { clsx } from 'clsx'

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

const adminItems = [
  { to: '/admin', icon: Settings, label: 'Admin' },
]

export function Sidebar() {
  const { profile, isAdmin, signOut } = useAuth()

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-surface-card border-r border-surface-border min-h-screen">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-border">
        <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">⚽</span>
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-tight">League H5</p>
          <p className="text-xs text-slate-400">Ligue interne</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
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
          <>
            <div className="pt-3 pb-1">
              <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Administration
              </p>
            </div>
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
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
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-surface-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() ?? profile?.email?.[0]?.toUpperCase() ?? '?'}
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
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-150"
        >
          <LogOut size={16} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
