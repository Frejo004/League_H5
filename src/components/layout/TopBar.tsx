import { Menu, X, LogOut, Settings } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Trophy, Calendar, Target,
  Users, User, BarChart2, Shield,
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
      <header className="lg:hidden sticky top-0 z-40
                         bg-surface-card/80 backdrop-blur-xl
                         border-b border-surface-border/50
                         px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-glow-sm">
            <span className="text-sm">⚽</span>
          </div>
          <span className="font-bold text-white text-sm tracking-wide">League H5</span>
        </div>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/8 transition-all duration-200"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Backdrop */}
      <div
        className={clsx(
          'lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300',
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setMenuOpen(false)}
      />

      {/* Drawer */}
      <div className={clsx(
        'lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col',
        'bg-surface-card/95 backdrop-blur-xl border-r border-surface-border/50',
        'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        menuOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Top glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-surface-border/40">
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 bg-primary-500 rounded-xl blur-md opacity-40" />
            <div className="relative w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
              <span className="text-lg">⚽</span>
            </div>
          </div>
          <div>
            <p className="font-bold text-white text-sm">League H5</p>
            <p className="text-[10px] text-primary-400/70 uppercase tracking-widest">Ligue interne</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive ? 'nav-active' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                )
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
          {isAdmin && (
            <>
              <div className="pt-3 pb-1.5 px-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-surface-border/60" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin</p>
                  <div className="flex-1 h-px bg-surface-border/60" />
                </div>
              </div>
              <NavLink
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive ? 'nav-active' : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  )
                }
              >
                <Settings size={17} />
                Administration
              </NavLink>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-surface-border/40 space-y-0.5">
          <NavLink
            to="/profile"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-primary-800
                            flex items-center justify-center text-white text-xs font-bold overflow-hidden
                            ring-2 ring-surface-border flex-shrink-0">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : (profile?.full_name?.[0]?.toUpperCase() ?? '?')
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{profile?.full_name ?? 'Utilisateur'}</p>
              <p className="text-[11px] text-slate-500 truncate">{profile?.email}</p>
            </div>
          </NavLink>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-xl text-sm text-slate-500
                       hover:text-red-400 hover:bg-red-500/8 transition-all duration-200"
          >
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>
      </div>
    </>
  )
}
