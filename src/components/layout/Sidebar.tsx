import { NavLink } from 'react-router-dom'
import { Settings, LogOut, User, Crown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { clsx } from 'clsx'
import { NAV_ITEMS } from '@/config/navigation'

export function Sidebar() {
  const { profile, isAdmin, isCaptain, signOut } = useAuth()

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen shrink-0
                      border-r border-surface-border relative overflow-hidden
                      z-20"
           style={{ backgroundColor: '#161c2d' }}>

      {/* Subtle pitch texture */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(ellipse 100% 60% at 50% 100%, rgba(34,197,94,0.04) 0%, transparent 70%)',
        }}
      />

      {/* Logo */}
      <div className="relative flex items-center gap-3 px-5 py-4 border-b border-surface-border">
        <div className="w-9 h-9 shrink-0">
          <img src="/logo-h5.png" alt="League H5" className="w-9 h-9 object-contain" />
        </div>
        <div>
          <p className="font-black text-white text-sm leading-tight tracking-tight">League H5</p>
          <p className="text-[9px] text-slate-500 uppercase tracking-[0.15em] font-semibold">Ligue interne</p>
        </div>
      </div>

      {/* Navigation */}
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
                  ? 'bg-primary-600/15 text-primary-400 border-primary-600/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-raised'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  className={clsx(
                    'shrink-0 transition-colors',
                    isActive ? 'text-primary-400' : 'text-slate-500'
                  )}
                />
                <span>{label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />
                )}
              </>
            )}
          </NavLink>
        ))}

        {isCaptain && !isAdmin && (
          <>
            <div className="mx-1 my-3 border-t border-surface-border" />
            <p className="px-3 pb-1 text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em]">
              Capitaine
            </p>
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
            <p className="px-3 pb-1 text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em]">
              Admin
            </p>
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

      {/* User footer */}
      <div className="relative border-t border-surface-border">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-4 py-3 transition-colors duration-150',
              isActive ? 'bg-surface-raised' : 'hover:bg-surface-raised'
            )
          }
        >
          <div className="relative w-8 h-8 shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-primary-800
                            flex items-center justify-center text-white text-xs font-bold overflow-hidden
                            ring-2 ring-surface-border">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                : (profile?.full_name?.[0]?.toUpperCase() ?? <User size={12} />)
              }
            </div>
            {/* Online dot */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500
                             border-2 border-surface-card" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-200 truncate leading-tight">
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
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  )
}
