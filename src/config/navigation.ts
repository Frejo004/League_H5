import {
  LayoutDashboard, Trophy, Calendar, Target,
  Users, User, BarChart2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  icon: LucideIcon
  label: string
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/',          icon: LayoutDashboard, label: 'Accueil' },
  { to: '/standings', icon: Trophy,          label: 'Classement' },
  { to: '/matches',   icon: Calendar,        label: 'Matchs' },
  { to: '/scorers',   icon: Target,          label: 'Buteurs' },
  { to: '/teams',     icon: Users,           label: 'Équipes' },
  { to: '/players',   icon: User,            label: 'Joueurs' },
  { to: '/stats',     icon: BarChart2,       label: 'Stats' },
]

/** Subset shown in the mobile bottom nav (limited space — no Joueurs) */
export const MOBILE_NAV_ITEMS: NavItem[] = NAV_ITEMS.filter(
  item => item.to !== '/players'
)

export const PAGE_TITLES: Record<string, string> = {
  '/':          'Accueil',
  '/standings': 'Classement',
  '/matches':   'Matchs',
  '/scorers':   'Buteurs',
  '/teams':     'Équipes',
  '/players':   'Joueurs',
  '/stats':     'Statistiques',
  '/admin':     'Administration',
  '/profile':   'Mon profil',
}
