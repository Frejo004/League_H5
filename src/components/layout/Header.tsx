import { useState, useEffect, useRef } from 'react'
import { NavLink, useLocation, Link, useSearchParams } from 'react-router-dom'
import {
  Bell, MessageCircle, LayoutDashboard, Trophy, Calendar,
  Target, Users, Star, Crown,
  Settings, User, X, Menu, LogOut, BookOpen, Swords,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useSettings } from '@/hooks/useSettings'
import { useNotifications } from '@/hooks/useNotifications'
import { useTheme, type ResolvedTheme } from '@/hooks/useTheme'
import { NotificationPanel } from '@/components/ui/NotificationPanel'
import { GlobalSearch } from '@/components/ui/GlobalSearch'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LiveTicker } from '@/components/live/LiveTicker'
import { useChatUnread } from '@/hooks/useChatUnread'
import type { UserRole } from '@/types/database'
import clsx from 'clsx'

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens - Adaptés au thème
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT = '#C8F135'
const NAV_OFF = 'var(--header-nav-off)'
const TEXT_PRIMARY = 'var(--header-text)'
const BG_MAIN = 'var(--header-bg)'
const BORDER = 'var(--header-border)'



// ─────────────────────────────────────────────────────────────────────────────
// Navigation par rôle
// ─────────────────────────────────────────────────────────────────────────────

interface NavItem { to: string; label: string; icon: typeof LayoutDashboard }

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  admin: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/standings', label: 'Classement', icon: Trophy },
    { to: '/matches', label: 'Matchs', icon: Calendar },
    { to: '/scorers', label: 'Buteurs', icon: Target },
    { to: '/teams', label: 'Équipes', icon: Users },
    { to: '/players', label: 'Joueurs', icon: User },
    { to: '/stats', label: 'Stats', icon: Star },
    { to: '/palmares', label: 'Palmarès', icon: Star },
    { to: '/rules', label: 'Règlement', icon: BookOpen },
    { to: '/admin', label: 'Admin', icon: Settings },
  ],
  captain: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/standings', label: 'Classement', icon: Trophy },
    { to: '/matches', label: 'Matchs', icon: Calendar },
    { to: '/scorers', label: 'Buteurs', icon: Target },
    { to: '/teams', label: 'Équipes', icon: Users },
    { to: '/players', label: 'Joueurs', icon: User },
    { to: '/stats', label: 'Stats', icon: Star },
    { to: '/palmares', label: 'Palmarès', icon: Star },
    { to: '/rules', label: 'Règlement', icon: BookOpen },
    { to: '/my-stats', label: 'Mes Stats', icon: Target },
    { to: '/captain', label: 'Mon Équipe', icon: Crown },
  ],
  player: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/standings', label: 'Classement', icon: Trophy },
    { to: '/matches', label: 'Matchs', icon: Calendar },
    { to: '/scorers', label: 'Buteurs', icon: Target },
    { to: '/teams', label: 'Équipes', icon: Users },
    { to: '/players', label: 'Joueurs', icon: User },
    { to: '/stats', label: 'Stats', icon: Star },
    { to: '/palmares', label: 'Palmarès', icon: Star },
    { to: '/rules', label: 'Règlement', icon: BookOpen },
    { to: '/my-stats', label: 'Mes Stats', icon: Target },
    { to: '/my-team', label: 'Mon Équipe', icon: Users },
  ],
  spectator: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/standings', label: 'Classement', icon: Trophy },
    { to: '/matches', label: 'Matchs', icon: Calendar },
    { to: '/scorers', label: 'Buteurs', icon: Target },
    { to: '/teams', label: 'Équipes', icon: Users },
    { to: '/players', label: 'Joueurs', icon: User },
    { to: '/palmares', label: 'Palmarès', icon: Star },
    { to: '/rules', label: 'Règlement', icon: BookOpen },
  ],
}

const ADMIN_SUBNAV = [
  { to: '/admin', label: 'Saisons', tab: 'seasons' },
  { to: '/admin', label: 'Équipes', tab: 'teams' },
  { to: '/admin', label: 'Matchs', tab: 'schedule' },
  { to: '/admin', label: 'Scores', tab: 'schedule' },
  { to: '/admin', label: 'Buts & Passes', tab: 'goals' },
  { to: '/admin', label: 'Spectateurs', tab: 'spectators' },
  { to: '/admin', label: 'Paramètres', tab: 'settings' },
]

// Mobile bottom nav (5 items max)
const MOBILE_NAV_BASE: NavItem[] = [
  { to: '/dashboard', label: 'Accueil', icon: LayoutDashboard },
  { to: '/matches', label: 'Matchs', icon: Calendar },
  { to: '/standings', label: 'Classement', icon: Trophy },
  { to: '/players', label: 'Joueurs', icon: User },
]

// ─────────────────────────────────────────────────────────────────────────────
// Couleurs par rôle
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<UserRole, { badgeBg: string; badgeText: string; avatarBg: string; avatarText: string; label: string }> = {
  admin: { badgeBg: 'rgba(200,241,53,0.15)', badgeText: '#C8F135', avatarBg: 'rgba(200,241,53,0.2)', avatarText: '#C8F135', label: 'Admin' },
  captain: { badgeBg: 'rgba(99,153,255,0.15)', badgeText: '#6399FF', avatarBg: 'rgba(99,153,255,0.2)', avatarText: '#6399FF', label: 'Capitaine' },
  player: { badgeBg: 'rgba(255,180,50,0.15)', badgeText: '#FFB432', avatarBg: 'rgba(255,180,50,0.2)', avatarText: '#FFB432', label: 'Joueur' },
  spectator: { 
    badgeBg: 'var(--color-surface-raised)', 
    badgeText: 'var(--color-text-muted)', 
    avatarBg: 'var(--color-surface-raised)', 
    avatarText: 'var(--color-text-muted)', 
    label: 'Spectateur' 
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────────────────────────────────────

function BallIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="#0D1117" strokeWidth="1.5" fill="#C8F135" />
      <path d="M12 2C12 2 9 6 9 12C9 18 12 22 12 22" stroke="#0D1117" strokeWidth="1.2" />
      <path d="M2 12H22" stroke="#0D1117" strokeWidth="1.2" />
      <path d="M4.5 6.5L12 9L19.5 6.5" stroke="#0D1117" strokeWidth="1" />
      <path d="M4.5 17.5L12 15L19.5 17.5" stroke="#0D1117" strokeWidth="1" />
    </svg>
  )
}

function Brand({ border, textColor }: { border: string; textColor: string }) {
  return (
    <Link
      to="/dashboard"
      className="flex items-center gap-2.5 px-5 shrink-0"
      style={{ minWidth: 160, borderRight: `1px solid ${border}`, height: '100%' }}
    >
      {/* Logo carré vert */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: ACCENT }}
      >
        <BallIcon />
      </div>
      {/* Titre */}
      <span
        className="text-lg tracking-tight leading-none select-none"
        style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontWeight: 800,
          color: textColor
        }}
      >
        LEAGUE <span style={{ color: ACCENT }}>H5</span>
      </span>
    </Link>
  )
}

function RoleBadge({ role }: { role: UserRole }) {
  const c = ROLE_COLORS[role]
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
      style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        backgroundColor: c.badgeBg,
        color: c.badgeText,
      }}
    >
      {c.label}
    </span>
  )
}

function Avatar({ profile, role }: { profile: { full_name?: string | null; avatar_url?: string | null; email?: string } | null; role: UserRole }) {
  const c = ROLE_COLORS[role]
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <Link to="/profile" className="shrink-0">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
        style={{ backgroundColor: c.avatarBg, color: c.avatarText, fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          : initials
        }
      </div>
    </Link>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Header principal
// ─────────────────────────────────────────────────────────────────────────────

export default function Header() {
  const { profile, role, isAdmin, isCaptain, signOut } = useAuth()
  const { data: season } = useActiveSeason()
  const { data: settings } = useSettings(season?.id)
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  const { notifications, count, hasUrgent, markAllRead, markRead } = useNotifications()
  const { data: chatTeams } = useChatUnread(profile?.id)
  const totalChatUnread = chatTeams?.reduce((s, t) => s + t.unread, 0) ?? 0
  const [searchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'seasons'

  // Ferme le drawer à chaque navigation (pattern React: adjust state during render)
  const [prevPathname, setPrevPathname] = useState(location.pathname)
  if (location.pathname !== prevPathname) {
    setPrevPathname(location.pathname)
    setMobileOpen(false)
  }
  // Bloque le scroll body quand le drawer est ouvert
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const effectiveRole: UserRole = role ?? 'spectator'
  // Injecter /playoffs dans la nav si activé dans les settings
  const playoffEnabled = settings?.playoff_enabled ?? false
  const playoffItem: NavItem = { to: '/playoffs', label: 'Playoffs', icon: Swords }
  const navItems = playoffEnabled
    ? NAV_BY_ROLE[effectiveRole].flatMap(item =>
        item.to === '/palmares' ? [item, playoffItem] : [item]
      )
    : NAV_BY_ROLE[effectiveRole]
  const roleColors = ROLE_COLORS[effectiveRole]

  const isAdminPage = location.pathname.startsWith('/admin')

  // Mobile bottom nav — ajoute Admin si admin, Mon Équipe si capitaine ou joueur
  const mobileNav: NavItem[] = isAdmin
    ? [...MOBILE_NAV_BASE, { to: '/admin', label: 'Admin', icon: Settings }]
    : isCaptain
      ? [...MOBILE_NAV_BASE, { to: '/captain', label: 'Mon Équipe', icon: Crown }]
      : (role === 'player')
        ? [...MOBILE_NAV_BASE, { to: '/my-team', label: 'Mon Équipe', icon: Users }]
        : MOBILE_NAV_BASE

  // Page title pour la mobile title bar
  const PAGE_TITLES: Record<string, string> = {
    '/dashboard':  'Tableau de bord',
    '/standings':  'Classement',
    '/matches':    'Matchs',
    '/scorers':    'Buteurs',
    '/teams':      'Équipes',
    '/players':    'Joueurs',
    '/stats':      'Statistiques',
    '/admin':      'Administration',
    '/captain':    'Mon Équipe',
    '/my-stats':   'Mes Stats',
    '/my-team':    'Mon Équipe',
    '/profile':    'Mon Profil',
    '/palmares':   'Palmarès',
    '/rules':      'Règlement',
    '/chat':       'Messages',
    '/playoffs':   'Phase Finale',
  }
  const pageTitle = Object.entries(PAGE_TITLES)
    .filter(([k]) => k !== '/dashboard')
    .find(([k]) => location.pathname.startsWith(k))?.[1]
    ?? (location.pathname === '/dashboard' ? 'Tableau de bord' : 'League H5')

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ════════════════════════════════════════════════════════════
          DESKTOP HEADER
          ════════════════════════════════════════════════════════════ */}
      <header
        className="hidden lg:flex flex-col w-full shrink-0 z-30"
        style={{ backgroundColor: 'var(--header-bg)', borderBottom: `1px solid var(--header-border)` }}
      >
        {/* ── Main bar (56px) ── */}
        <div className="flex items-stretch h-14">

          {/* Brand — gauche */}
          <Brand border="var(--header-border)" textColor="var(--header-text)" />

          {/* Nav principale — flex-1, scrollable si débordement */}
          <nav
            className="flex-1 flex items-stretch overflow-x-auto min-w-0"
            style={{ scrollbarWidth: 'none' }}
            aria-label="Navigation principale"
          >
            {navItems.map(({ to, label }) => (
              <NavLink
                key={`${to}-${label}`}
                to={to}
                end={to === '/dashboard'}
                aria-current={location.pathname === to || (to !== '/' && location.pathname.startsWith(to)) ? 'page' : undefined}
                className="relative flex items-center px-3 text-[13px] font-semibold whitespace-nowrap
                           transition-colors duration-150 shrink-0 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded"
                style={({ isActive }) => ({
                  fontFamily: "'Barlow', sans-serif",
                  color: isActive ? 'var(--accent)' : 'var(--header-nav-off)',
                  borderBottom: isActive ? `2px solid var(--accent)` : '2px solid transparent',
                })}
                onMouseEnter={e => {
                  const el = e.currentTarget
                  if (!el.getAttribute('aria-current')) el.style.color = 'var(--header-nav-hov)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  if (!el.getAttribute('aria-current')) el.style.color = 'var(--header-nav-off)'
                }}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Zone droite — fixe à droite */}
          <div
            className="flex items-center gap-2 px-4 shrink-0"
            style={{ borderLeft: `1px solid var(--header-border)` }}
          >
            {/* Recherche globale */}
            <GlobalSearch />

            {/* Toggle de thème */}
            <ThemeToggle />

            {/* Icône Chat → /chat */}
            {profile && (
              <NavLink
                to="/chat"
                className="relative p-1.5 rounded-lg transition-colors"
                style={({ isActive }) => ({ color: isActive ? 'var(--header-text)' : 'var(--header-nav-off)' })}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--header-text)' }}
                onMouseLeave={e => {
                  if (!location.pathname.startsWith('/chat'))
                    (e.currentTarget as HTMLElement).style.color = 'var(--header-nav-off)'
                }}
                aria-label="Messages"
              >
                <MessageCircle size={17} />
                {totalChatUnread > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full
                               flex items-center justify-center text-[9px] font-black"
                    style={{ backgroundColor: 'var(--accent)', color: '#0D1117' }}
                  >
                    {totalChatUnread > 9 ? '9+' : totalChatUnread}
                  </span>
                )}
              </NavLink>
            )}

            {/* Cloche */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen(v => !v)}
                className="relative p-1.5 rounded-lg transition-colors"
                style={{ color: notifOpen ? 'var(--header-text)' : 'var(--header-nav-off)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--header-text)' }}
                onMouseLeave={e => { if (!notifOpen) (e.currentTarget as HTMLElement).style.color = 'var(--header-nav-off)' }}
                aria-label="Notifications"
              >
                <Bell size={17} />
                {count > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full
                               flex items-center justify-center text-[9px] font-black"
                    style={{
                      backgroundColor: hasUrgent ? '#ef4444' : 'var(--accent)',
                      color: hasUrgent ? 'white' : '#0D1117',
                    }}
                  >
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </button>

              {notifOpen && (
                <NotificationPanel
                  notifications={notifications}
                  onClose={() => setNotifOpen(false)}
                  onMarkAllRead={markAllRead}
                  onMarkRead={markRead}
                />
              )}
            </div>

            {/* Badge rôle */}
            <RoleBadge role={effectiveRole} />

            {/* Avatar + déconnexion */}
            <div className="flex items-center gap-1.5">
              <Avatar profile={profile} role={effectiveRole} />
              <button
                onClick={signOut}
                className="p-1.5 rounded-lg transition-colors group"
                style={{ color: 'var(--header-nav-off)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--header-nav-off)' }}
                title="Se déconnecter"
                aria-label="Se déconnecter"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Sous-nav Admin (38px) ── */}
        {isAdminPage && (
          <div
            className="flex items-center px-5 gap-1 overflow-x-auto"
            style={{
              height: 38,
              backgroundColor: 'var(--header-sub)',
              borderTop: `1px solid var(--header-border)`,
            }}
          >
            {ADMIN_SUBNAV.map(({ label, to, tab }, i) => {
              const isActive = currentTab === tab
              return (
                <Link
                  key={i}
                  to={`${to}?tab=${tab}`}
                  className="px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors"
                  style={{
                    fontFamily: "'Barlow', sans-serif",
                    color: isActive ? 'var(--accent)' : 'var(--header-nav-off)',
                    backgroundColor: isActive ? `var(--accent)15` : 'transparent',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--header-nav-hov)' }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = 'var(--header-nav-off)' }}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        )}

        <LiveTicker />
      </header>

      {/* ════════════════════════════════════════════════════════════
          MOBILE HEADER
          ════════════════════════════════════════════════════════════ */}

      {/* ── Header mobile complet (Topbar + Titlebar) ── */}
      <div className="lg:hidden sticky top-0 z-30 flex flex-col w-full shadow-sm">
        {/* Topbar (56px) */}
        <header
          style={{
            backgroundColor: 'var(--header-bg)',
            borderBottom: `1px solid var(--header-border)`,
            paddingTop: 'env(safe-area-inset-top, 0px)',
          }}
        >
          <div className="flex items-center justify-between px-4 h-14">
            {/* Brand */}
            <Link to="/dashboard" className="flex items-center gap-1.5">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <BallIcon />
              </div>
              <span
                className="text-sm leading-none"
                style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontWeight: 800,
                  color: 'var(--header-text)'
                }}
              >
                LEAGUE <span style={{ color: 'var(--accent)' }}>H5</span>
              </span>
            </Link>

            {/* Droite */}
            <div className="flex items-center gap-1.5">
              <GlobalSearch />

              {/* Cloche notifications mobile */}
              <div ref={notifRef} className="relative">
                <button
                  onClick={() => setNotifOpen(v => !v)}
                  className="relative p-1.5 rounded-lg transition-colors"
                  style={{ color: notifOpen ? 'var(--header-text)' : 'var(--header-nav-off)' }}
                  aria-label="Notifications"
                >
                  <Bell size={19} />
                  {count > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full
                                 flex items-center justify-center text-[9px] font-black"
                      style={{
                        backgroundColor: hasUrgent ? '#ef4444' : 'var(--accent)',
                        color: hasUrgent ? 'white' : '#0D1117',
                      }}
                    >
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <NotificationPanel
                    notifications={notifications}
                    onClose={() => setNotifOpen(false)}
                    onMarkAllRead={markAllRead}
                    onMarkRead={markRead}
                  />
                )}
              </div>

              {/* Icône Chat mobile */}
              {profile && (
                <NavLink
                  to="/chat"
                  className="relative p-1.5 rounded-lg transition-colors"
                  style={({ isActive }) => ({ color: isActive ? 'var(--header-text)' : 'var(--header-nav-off)' })}
                  aria-label="Messages"
                >
                  <MessageCircle size={19} />
                  {totalChatUnread > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full
                             flex items-center justify-center text-[9px] font-black"
                      style={{ backgroundColor: 'var(--accent)', color: '#0D1117' }}
                    >
                      {totalChatUnread > 9 ? '9+' : totalChatUnread}
                    </span>
                  )}
                </NavLink>
              )}

              <Avatar profile={profile} role={effectiveRole} />
              <button
                onClick={() => setMobileOpen(true)}
                className="p-1 rounded-lg"
                style={{ color: 'var(--header-nav-off)' }}
                aria-label="Ouvrir le menu"
              >
                <Menu size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Page title bar mobile (38px) */}
        <div
          className="flex items-center px-4 gap-2"
          style={{
            height: 38,
            backgroundColor: 'var(--header-sub)',
            borderBottom: `1px solid var(--header-border)`,
          }}
        >
          <span
            className="text-sm font-bold"
            style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              color: 'var(--header-text)'
            }}
          >
            {pageTitle}
          </span>
          {season && (
            <span
              className="text-xs ml-1"
              style={{ color: NAV_OFF, fontFamily: "'Barlow', sans-serif" }}
            >
              · {season.name}
            </span>
          )}
        </div>

        <LiveTicker />
      </div>

      {/* ── Drawer mobile ── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />

          {/* Panel — slide-in depuis la gauche */}
          <div
            className="absolute top-0 left-0 bottom-0 w-72 flex flex-col overflow-y-auto animate-slide-in-left"
            style={{ backgroundColor: BG_MAIN, borderRight: `1px solid ${BORDER}` }}
          >
            {/* Header drawer */}
            <div
              className="flex flex-col shrink-0"
              style={{
                backgroundColor: BG_MAIN,
                borderBottom: `1px solid ${BORDER}`,
                paddingTop: 'env(safe-area-inset-top, 0px)',
              }}
            >
              <div className="flex items-center justify-between px-5 h-14">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: ACCENT }}
                  >
                    <BallIcon />
                  </div>
                  <span
                    className="text-base leading-none"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}
                  >
                    LEAGUE <span style={{ color: ACCENT }}>H5</span>
                  </span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg"
                  style={{ color: NAV_OFF }}
                  aria-label="Fermer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Nav items */}
              <nav className="flex-1 py-3 px-3 space-y-0.5" aria-label="Navigation mobile">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={`${to}-${label}`}
                    to={to}
                    end={to === '/dashboard'}
                    aria-current={location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to)) ? 'page' : undefined}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  style={({ isActive }) => ({
                    fontFamily: "'Barlow', sans-serif",
                    color: isActive ? ACCENT : NAV_OFF,
                    backgroundColor: isActive ? `${ACCENT}12` : 'transparent',
                    border: `1px solid ${isActive ? `${ACCENT}25` : 'transparent'}`,
                  })}
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}

              {/* Theme Toggle dans le menu mobile */}
              <div className="pt-2 px-1">
                <ThemeToggle showLabel={true} className="w-full justify-start gap-3" />
              </div>
            </nav>

            {/* Footer drawer */}
            <div
              className="px-4 py-4 shrink-0 space-y-3"
              style={{ borderTop: `1px solid ${BORDER}` }}
            >
              {season && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(128,128,128,0.1)' }}
                >
                  <span className="text-xs" style={{ color: NAV_OFF, fontFamily: "'Barlow', sans-serif" }}>
                    Saison active :
                  </span>
                  <span className="text-xs font-semibold" style={{ fontFamily: "'Barlow', sans-serif", color: TEXT_PRIMARY }}>
                    {season.name}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 px-3 py-2">
                <Avatar profile={profile} role={effectiveRole} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate" style={{ fontFamily: "'Barlow', sans-serif", color: TEXT_PRIMARY }}>
                    {profile?.full_name ?? profile?.email?.split('@')[0] ?? 'Utilisateur'}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: NAV_OFF }}>{profile?.email}</p>
                </div>
                <RoleBadge role={effectiveRole} />
                <button
                  onClick={signOut}
                  className="p-1.5 rounded-lg shrink-0 transition-colors"
                  style={{ color: NAV_OFF }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = NAV_OFF }}
                  title="Se déconnecter"
                  aria-label="Se déconnecter"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          MOBILE BOTTOM NAV
          ════════════════════════════════════════════════════════════ */}
      <div
        className="lg:hidden fixed left-4 right-4 z-30 pointer-events-none"
        style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <nav
          className="pointer-events-auto mx-auto max-w-sm rounded-2xl glass-morphism shadow-2xl flex items-stretch overflow-hidden border border-white/10"
          style={{
            height: 56,
            background: 'rgba(13, 17, 23, 0.9)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)'
          }}
          aria-label="Navigation bas"
        >
          {mobileNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              aria-current={location.pathname === to || (to !== '/dashboard' && location.pathname.startsWith(to)) ? 'page' : undefined}
              className="relative flex flex-col items-center justify-center gap-1 flex-1 transition-all duration-300 group"
              style={({ isActive }) => ({
                color: isActive ? ACCENT : NAV_OFF,
              })}
            >
              {({ isActive }) => (
                <>
                  {/* Active pill background effect */}
                  <div className={clsx(
                    "absolute inset-0 flex items-center justify-center transition-all duration-300",
                    isActive ? "opacity-100" : "opacity-0 scale-50"
                  )}>
                    <div className="w-10 h-10 rounded-xl"
                      style={{ backgroundColor: `${ACCENT}15`, border: `1px solid ${ACCENT}25` }} />
                  </div>

                  {/* Icon floating animation */}
                  <div className={clsx(
                    "relative z-10 transition-transform duration-300 ease-out",
                    isActive ? "-translate-y-1" : "group-hover:-translate-y-0.5"
                  )}>
                    <Icon size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>

                  {/* Label dot animation */}
                  <span
                    className={clsx(
                      "relative z-10 text-[9px] font-bold uppercase tracking-widest transition-all duration-300",
                      isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 absolute bottom-2"
                    )}
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          {/* Chat dans la bottom nav */}
          {profile && (
            <NavLink
              to="/chat"
              className="relative flex flex-col items-center justify-center gap-1 flex-1 transition-all duration-300 group"
              style={({ isActive }) => ({ color: isActive ? ACCENT : NAV_OFF })}
            >
              {({ isActive }) => (
                <>
                  <div className={clsx(
                    "absolute inset-0 flex items-center justify-center transition-all duration-300",
                    isActive ? "opacity-100" : "opacity-0 scale-50"
                  )}>
                    <div className="w-10 h-10 rounded-xl"
                      style={{ backgroundColor: `${ACCENT}15`, border: `1px solid ${ACCENT}25` }} />
                  </div>

                  <div className={clsx(
                    "relative z-10 transition-transform duration-300 ease-out",
                    isActive ? "-translate-y-1" : "group-hover:-translate-y-0.5"
                  )}>
                    <MessageCircle size={isActive ? 22 : 20} strokeWidth={isActive ? 2.5 : 1.8} />
                    {totalChatUnread > 0 && (
                      <span
                        className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full
                                   flex items-center justify-center text-[9px] font-black shadow-lg"
                        style={{ backgroundColor: '#ef4444', color: '#fff' }}
                      >
                        {totalChatUnread > 9 ? '9+' : totalChatUnread}
                      </span>
                    )}
                  </div>

                  <span
                    className={clsx(
                      "relative z-10 text-[9px] font-bold uppercase tracking-widest transition-all duration-300",
                      isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 absolute bottom-2"
                    )}
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
                  >
                    Chat
                  </span>
                </>
              )}
            </NavLink>
          )}
        </nav>
      </div>
    </>
  )
}
