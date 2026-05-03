import { Menu, X, LogOut, Settings, User, Crown, Trophy } from 'lucide-react'
import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuth } from '@/hooks/useAuth'
import { NAV_ITEMS, PAGE_TITLES } from '@/config/navigation'

export function TopBar() {
  const { profile, isAdmin, isCaptain, signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30
                         bg-surface-card border-b border-surface-border
                         px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center shrink-0">
            <Trophy size={13} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm">
            {PAGE_TITLES[location.pathname] ?? 'League H5'}
          </span>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          className="p-1.5 text-slate-400 hover:text-white transition-colors"
          aria-label="Menu"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Drawer overlay */}
      <div className={clsx(
        'lg:hidden fixed inset-0 z-50 transition-all duration-250',
        menuOpen ? 'visible' : 'invisible'
      )}>
        {/* Backdrop */}
        <div
          className={clsx(
            'absolute inset-0 bg-black/60 transition-opacity duration-250',
            menuOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setMenuOpen(false)}
        />

        {/* Drawer */}
        <div className={clsx(
          'absolute top-0 left-0 bottom-0 w-64 flex flex-col',
          'bg-surface-card border-r border-surface-border',
          'transition-transform duration-250 ease-out',
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        )}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 h-12 border-b border-surface-border shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center shrink-0">
                <Trophy size={13} className="text-white" />
              </div>
              <p className="font-bold text-white text-sm">League H5</p>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-1 text-slate-500 hover:text-white transition-colors"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 py-2 overflow-y-auto">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors border-l-2',
                    isActive
                      ? 'nav-active'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-surface-raised border-l-transparent'
                  )
                }
              >
                <Icon size={16} className="shrink-0" />
                {label}
              </NavLink>
            ))}

            {isCaptain && !isAdmin && (
              <>
                <div className="mx-4 my-2 border-t border-surface-border" />
                <p className="px-4 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Capitaine</p>
                <NavLink
                  to="/captain"
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors border-l-2',
                      isActive
                        ? 'bg-amber-500/10 text-amber-400 border-l-amber-500'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-surface-raised border-l-transparent'
                    )
                  }
                >
                  <Crown size={16} className="shrink-0" />
                  Mon équipe
                </NavLink>
              </>
            )}

            {isAdmin && (
              <>
                <div className="mx-4 my-2 border-t border-surface-border" />
                <p className="px-4 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Admin</p>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors border-l-2',
                      isActive
                        ? 'nav-active'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-surface-raised border-l-transparent'
                    )
                  }
                >
                  <Settings size={16} className="shrink-0" />
                  Administration
                </NavLink>
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="border-t border-surface-border pb-20">
            <NavLink
              to="/profile"
              className="flex items-center gap-3 px-4 py-3 hover:bg-surface-raised transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-primary-700 flex items-center justify-center
                              text-white text-xs font-bold overflow-hidden shrink-0">
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (profile?.full_name?.[0]?.toUpperCase() ?? <User size={12} />)
                }
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {profile?.full_name ?? profile?.email?.split('@')[0] ?? 'Utilisateur'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{profile?.email}</p>
              </div>
            </NavLink>

            <button
              onClick={signOut}
              className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-slate-500
                         hover:text-red-400 hover:bg-surface-raised transition-colors"
            >
              <LogOut size={15} className="shrink-0" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
