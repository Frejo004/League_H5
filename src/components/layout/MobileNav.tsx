import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Trophy,
  Calendar,
  Target,
  Users,
  BarChart2,
} from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { to: '/',          icon: LayoutDashboard, label: 'Accueil' },
  { to: '/standings', icon: Trophy,          label: 'Classement' },
  { to: '/matches',   icon: Calendar,        label: 'Matchs' },
  { to: '/scorers',   icon: Target,          label: 'Buteurs' },
  { to: '/teams',     icon: Users,           label: 'Équipes' },
  { to: '/stats',     icon: BarChart2,       label: 'Stats' },
]

export function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-card border-t border-surface-border">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors duration-150 min-w-0',
                isActive
                  ? 'text-primary-400'
                  : 'text-slate-500 hover:text-slate-300'
              )
            }
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
