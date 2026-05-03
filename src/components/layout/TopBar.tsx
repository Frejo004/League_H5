import { Menu, X, LogOut, Settings } from 'lucide-react'
import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuth } from '@/hooks/useAuth'
import { NAV_ITEMS, PAGE_TITLES } from '@/config/navigation'

export function TopBar() {
  const { profile, isAdmin, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close drawer on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <>
      {/* Top header bar — mobile only */}
      <header className="lg:hidden sticky top-0 z-30
                         bg-surface-card/95 backdrop-blur-xl
                         border-b border-surface-border/50
                         px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-linear-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-glow-sm">
            <span className="text-sm">⚽</span>
          </div>
          <span className="font-black text-white text-sm tracking-tight">
            {PAGE_TITLES[location.pathname] ?? 'League H5'}
          </span>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/8 transition-all duration-200"
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Overlay + Drawer — rendered as portal-like fixed layer */}
      <div className={clsx(
        'lg:hidden fixed inset-0 z-50 transition-all duration-300',
        menuOpen ? 'visible' : 'invisible'
      )}>
        {/* Backdrop */}
        <div
          className={clsx(
            'absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300',
            menuOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setMenuOpen(false)}
        />

        {/* Drawer panel */}
        <div className={clsx(
          'absolute top-0 left-0 bottom-0 w-72 flex flex-col',
          'bg-surface-card border-r border-surface-border/60',
          'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          {/* Top glow line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary-500/30 to-transparent" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border/40">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9">
                <div className="absolute inset-0 bg-primary-500 rounded-xl blur-md opacity-40" />
                <div className="relative w-9 h-9 bg-linear-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
                  <span className="text-lg">⚽</span>
                </div>
              </div>
              <div>
                <p className="font-bold text-white text-sm">League H5</p>
                <p className="text-[10px] text-primary-400/70 uppercase tracking-widest">Ligue interne</p>
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/8 transition-all"
              aria-label="Fermer le menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto pb-2">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
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

          {/* Footer — user + logout — padding-bottom pour ne pas être masqué par la bottom nav mobile */}
          <div className="px-3 pt-3 pb-20 border-t border-surface-border/40 space-y-0.5">
            <NavLink
              to="/profile"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-primary-600 to-primary-800
                              flex items-center justify-center text-white text-xs font-bold overflow-hidden
                              ring-2 ring-surface-border shrink-0">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (profile?.full_name?.[0]?.toUpperCase() ?? profile?.email?.[0]?.toUpperCase() ?? '?')
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-200 truncate">
                  {profile?.full_name ?? profile?.email?.split('@')[0] ?? 'Utilisateur'}
                </p>
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
      </div>
    </>
  )
}
