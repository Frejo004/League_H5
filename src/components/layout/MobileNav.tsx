import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { MOBILE_NAV_ITEMS } from '@/config/navigation'

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-surface-card/95 backdrop-blur-md border-t border-surface-border" />

      {/* Pitch line accent */}
      <div className="absolute top-0 left-0 right-0 h-px
                      bg-gradient-to-r from-transparent via-primary-600/40 to-transparent" />

      <div className="relative flex items-center justify-around px-2 py-1.5">
        {MOBILE_NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex flex-col items-center gap-0.5 px-2 py-1.5 min-w-0 flex-1
                       transition-all duration-200 relative"
          >
            {({ isActive }) => (
              <>
                {/* Active pill background */}
                {isActive && (
                  <span className="absolute inset-x-1 inset-y-0.5 rounded-lg
                                   bg-primary-600/15 border border-primary-600/20
                                   animate-scale-in" />
                )}

                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={clsx(
                    'relative z-10 transition-all duration-200',
                    isActive
                      ? 'text-primary-400 drop-shadow-[0_0_6px_rgba(96,165,250,0.6)]'
                      : 'text-slate-600'
                  )}
                />
                <span className={clsx(
                  'relative z-10 text-[9px] font-bold truncate transition-colors duration-200',
                  isActive ? 'text-primary-400' : 'text-slate-600'
                )}>
                  {label}
                </span>

                {/* Active dot */}
                {isActive && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2
                                   w-1 h-1 rounded-full bg-primary-400 animate-scale-in" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
