import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { MOBILE_NAV_ITEMS } from '@/config/navigation'

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50
                    bg-surface-card border-t border-surface-border">
      <div className="flex items-center justify-around px-1 py-1">
        {MOBILE_NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 px-3 py-2 min-w-0 flex-1 transition-colors duration-150',
                isActive ? 'text-primary-400' : 'text-slate-600'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={19} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={clsx(
                  'text-[9px] font-semibold truncate',
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
