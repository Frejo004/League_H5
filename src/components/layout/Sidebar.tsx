import { NavLink } from 'react-router-dom'
import { Settings, LogOut, User, Crown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { clsx } from 'clsx'
import { NAV_ITEMS } from '@/config/navigation'

export function Sidebar() {
  const { profile, isAdmin, isCaptain, signOut } = useAuth()

  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen shrink-0
                      bg-surface-card border-r border-surface-border">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-surface-border">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-base">⚽</span>
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-tight">League H5</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Ligue interne</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-l-2',
                isActive
                  ? 'nav-active'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-raised border-l-transparent'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className={clsx(
                    'shrink-0',
                    isActive ? 'text-primary-400' : 'text-slate-500'
                  )}
                />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {isCaptain && !isAdmin && (
          <>
            <div className="mx-4 my-2 border-t border-surface-border" />
            <p className="px-4 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              Capitaine
            </p>
            <NavLink
              to="/captain"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-l-2',
                  isActive
                    ? 'nav-active'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-raised border-l-transparent'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Crown
                    size={16}
                    className={clsx('shrink-0', isActive ? 'text-amber-400' : 'text-slate-500')}
                  />
                  <span>Mon équipe</span>
                </>
              )}
            </NavLink>
          </>
        )}

        {isAdmin && (
          <>
            <div className="mx-4 my-2 border-t border-surface-border" />
            <p className="px-4 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
              Admin
            </p>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors duration-150 border-l-2',
                  isActive
                    ? 'nav-active'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-raised border-l-transparent'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Settings
                    size={16}
                    className={clsx('shrink-0', isActive ? 'text-primary-400' : 'text-slate-500')}
                  />
                  <span>Administration</span>
                </>
              )}
            </NavLink>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-surface-border">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-4 py-3 transition-colors duration-150',
              isActive ? 'bg-surface-raised' : 'hover:bg-surface-raised'
            )
          }
        >
          <div className="w-7 h-7 rounded-full bg-primary-700 flex items-center justify-center
                          text-white text-xs font-bold overflow-hidden shrink-0">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
              : (profile?.full_name?.[0]?.toUpperCase() ?? <User size={12} />)
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-200 truncate leading-tight">
              {profile?.full_name ?? profile?.email?.split('@')[0] ?? 'Utilisateur'}
            </p>
            <p className="text-[10px] text-slate-500 truncate">{profile?.email}</p>
          </div>
        </NavLink>

        <button
          onClick={signOut}
          className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-slate-500
                     hover:text-red-400 hover:bg-surface-raised transition-colors duration-150"
        >
          <LogOut size={15} className="shrink-0" />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}
