import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { MOBILE_NAV_ITEMS } from '@/config/navigation'

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50
                    bg-surface-card/90 backdrop-blur-xl
                    border-t border-surface-border/50
                    safe-area-inset-bottom">
      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent" />

      <div className="flex items-center justify-around px-1 py-2">
        {MOBILE_NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-0 flex-1',
                isActive ? 'text-primary-400' : 'text-slate-600 hover:text-slate-400'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={clsx(
                  'p-1.5 rounded-lg transition-all duration-200',
                  isActive ? 'bg-primary-600/20 shadow-glow-sm' : ''
                )}>
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
                </div>
                <span className={clsx(
                  'text-[9px] font-semibold truncate transition-all duration-200',
                  isActive ? 'text-primary-400' : 'text-slate-600'
                )}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
