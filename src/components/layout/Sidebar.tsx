import { NavLink } from 'react-router-dom'
import { Settings, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { clsx } from 'clsx'
import { NAV_ITEMS } from '@/config/navigation'

export function Sidebar() {
  const { profile, isAdmin, signOut } = useAuth()

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen relative
                      bg-surface-card/60 backdrop-blur-xl
                      border-r border-surface-border/50">

      {/* Ambient glow top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-surface-border/40">
        <div className="relative w-9 h-9">
          <div className="absolute inset-0 bg-primary-500 rounded-xl blur-md opacity-40" />
          <div className="relative w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-glow-sm">
            <span className="text-lg">⚽</span>
          </div>
        </div>
        <div>
          <p className="font-bold text-white text-sm leading-tight tracking-wide">League H5</p>
          <p className="text-[10px] text-primary-400/70 font-medium uppercase tracking-widest">Ligue interne</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'nav-active'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={clsx(
                  'flex-shrink-0 transition-all duration-200',
                  isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'
                )}>
                  <Icon size={17} />
                </span>
                <span className="truncate">{label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 shadow-glow-sm" />
                )}
              </>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1.5 px-3">
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
                  'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'nav-active'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={clsx(
                    'flex-shrink-0 transition-all duration-200',
                    isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'
                  )}>
                    <Settings size={17} />
                  </span>
                  <span>Administration</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 shadow-glow-sm" />
                  )}
                </>
              )}
            </NavLink>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-surface-border/40 space-y-0.5">
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            clsx(
              'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
              isActive ? 'nav-active' : 'hover:bg-white/5'
            )
          }
        >
          <div className="relative w-8 h-8 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center text-white text-xs font-bold overflow-hidden ring-2 ring-surface-border">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : (profile?.full_name?.[0]?.toUpperCase() ?? profile?.email?.[0]?.toUpperCase() ?? '?')
              }
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-primary-500 rounded-full border-2 border-surface-card" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-200 truncate leading-tight">
              {profile?.full_name ?? profile?.email?.split('@')[0] ?? 'Utilisateur'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{profile?.email}</p>
          </div>
        </NavLink>

        <button
          onClick={signOut}
          className="group flex items-center gap-3 px-3 py-2 w-full rounded-xl text-sm text-slate-500
                     hover:text-red-400 hover:bg-red-500/8 transition-all duration-200"
        >
          <LogOut size={15} className="group-hover:rotate-12 transition-transform duration-200" />
          <span>Déconnexion</span>
        </button>
      </div>

      {/* Bottom ambient glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-surface-border/50 to-transparent" />
    </aside>
  )
}
