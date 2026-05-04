import { Menu, X, LogOut, Settings, User, Crown } from 'lucide-react'
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

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'League H5'

  return (
    <>
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 h-13">
        {/* Blur backdrop */}
        <div className="absolute inset-0 bg-surface-card/95 backdrop-blur-md border-b border-surface-border" />
        {/* Pitch line bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-px
                        bg-gradient-to-r from-transparent via-primary-600/30 to-transparent" />

        <div className="relative flex items-center justify-between px-4 h-13">
          {/* Logo + title */}
          <div className="flex items-center gap-2.5">
            <img src="/logo-h5.png" alt="League H5" className="w-7 h-7 object-contain shrink-0" />
            <div>
              <span className="font-black text-white text-sm tracking-tight">{pageTitle}</span>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Live indicator si on est sur une page de match */}
            {location.pathname.startsWith('/matches/') && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full
                               bg-red-500/15 border border-red-500/25 text-red-400
                               text-[10px] font-bold uppercase tracking-wider">
                <span className="live-dot" />
                Live
              </span>
            )}

            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-surface-raised
                         rounded-lg transition-all duration-150"
              aria-label="Menu"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Drawer overlay */}
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

        {/* Drawer */}
        <div className={clsx(
          'absolute top-0 left-0 bottom-0 w-72 flex flex-col',
          'bg-surface-card border-r border-surface-border',
          'transition-transform duration-300 ease-out',
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          {/* Pitch texture */}
          <div className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(ellipse 100% 50% at 50% 100%, rgba(34,197,94,0.04) 0%, transparent 70%)',
            }}
          />

          {/* Header */}
          <div className="relative flex items-center justify-between px-5 h-14 border-b border-surface-border shrink-0">
            <div className="flex items-center gap-3">
              <img src="/logo-h5.png" alt="League H5" className="w-8 h-8 object-contain shrink-0" />
              <div>
                <p className="font-black text-white text-sm tracking-tight">League H5</p>
                <p className="text-[9px] text-slate-500 uppercase tracking-[0.15em]">Ligue interne</p>
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-surface-raised
                         rounded-lg transition-all duration-150"
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Nav */}
          <nav className="relative flex-1 py-3 overflow-y-auto space-y-0.5 px-2">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold',
                    'transition-all duration-150 border border-transparent',
                    isActive
                      ? 'bg-primary-600/15 text-primary-400 border-primary-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-surface-raised'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon size={16} className={clsx('shrink-0', isActive ? 'text-primary-400' : 'text-slate-500')} />
                    <span>{label}</span>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />}
                  </>
                )}
              </NavLink>
            ))}

            {isCaptain && !isAdmin && (
              <>
                <div className="mx-1 my-3 border-t border-surface-border" />
                <p className="px-3 pb-1 text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em]">Capitaine</p>
                <NavLink
                  to="/captain"
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold',
                      'transition-all duration-150 border border-transparent',
                      isActive
                        ? 'bg-amber-500/12 text-amber-400 border-amber-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-surface-raised'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Crown size={16} className={clsx('shrink-0', isActive ? 'text-amber-400' : 'text-slate-500')} />
                      <span>Mon équipe</span>
                      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                    </>
                  )}
                </NavLink>
              </>
            )}

            {isAdmin && (
              <>
                <div className="mx-1 my-3 border-t border-surface-border" />
                <p className="px-3 pb-1 text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em]">Admin</p>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold',
                      'transition-all duration-150 border border-transparent',
                      isActive
                        ? 'bg-primary-600/15 text-primary-400 border-primary-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-surface-raised'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Settings size={16} className={clsx('shrink-0', isActive ? 'text-primary-400' : 'text-slate-500')} />
                      <span>Administration</span>
                      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />}
                    </>
                  )}
                </NavLink>
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="relative border-t border-surface-border pb-20">
            <NavLink
              to="/profile"
              className="flex items-center gap-3 px-4 py-3 hover:bg-surface-raised transition-colors"
            >
              <div className="relative w-8 h-8 shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-primary-800
                                flex items-center justify-center text-white text-xs font-bold overflow-hidden
                                ring-2 ring-surface-border">
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : (profile?.full_name?.[0]?.toUpperCase() ?? <User size={12} />)
                  }
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500
                                 border-2 border-surface-card" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">
                  {profile?.full_name ?? profile?.email?.split('@')[0] ?? 'Utilisateur'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{profile?.email}</p>
              </div>
            </NavLink>

            <button
              onClick={signOut}
              className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-slate-500
                         hover:text-red-400 hover:bg-surface-raised transition-all duration-150 group"
            >
              <LogOut size={14} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
