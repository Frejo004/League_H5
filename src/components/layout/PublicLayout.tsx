import { Link, useLocation } from 'react-router-dom'
import { Trophy, Home, LogIn, Sun, Moon, BarChart2 } from 'lucide-react'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'

const ACCENT = '#C8F135'

interface PublicLayoutProps {
  children: React.ReactNode
  hideFooter?: boolean
}

export function PublicLayout({ children, hideFooter = false }: PublicLayoutProps) {
  const location = useLocation()
  const { profile } = useAuth()
  const logoLink = profile ? '/dashboard' : '/'

  // Utilise le même système de thème que l'app privée (data-theme sur html)
  const { resolvedTheme, toggleTheme } = useTheme()
  const dark = resolvedTheme === 'dark'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const navItems = [
    { to: '/', label: 'Accueil', icon: Home },
    { to: '/public/matches', label: 'Matchs', icon: Trophy },
    { to: '/public/standings', label: 'Classement', icon: BarChart2 },
  ]

  return (
    <div className={`min-h-[100dvh] flex flex-col selection:bg-[#C8F135] selection:text-[#0D1117] transition-colors duration-300`} style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
      {/* ── PUBLIC HEADER ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-300 pt-[env(safe-area-inset-top)]" style={{ borderColor: 'var(--header-border)', backgroundColor: dark ? 'rgba(13,17,23,0.8)' : 'rgba(248,250,252,0.8)' }}>
        <div className="max-w-5xl mx-auto px-4 flex items-center h-16 justify-between gap-4">

          {/* Logo */}
          <Link to={logoLink} className="flex items-center gap-2.5 shrink-0 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 duration-300"
              style={{ backgroundColor: ACCENT }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="#0D1117" strokeWidth="1.5" fill={ACCENT} />
                <path d="M12 2C12 2 9 6 9 12C9 18 12 22 12 22" stroke="#0D1117" strokeWidth="1.2" />
                <path d="M2 12H22" stroke="#0D1117" strokeWidth="1.2" />
                <path d="M4.5 6.5L12 9L19.5 6.5" stroke="#0D1117" strokeWidth="1" />
                <path d="M4.5 17.5L12 15L19.5 17.5" stroke="#0D1117" strokeWidth="1" />
              </svg>
            </div>
            <span
              className="text-lg font-black tracking-wider select-none font-['Barlow_Condensed']"
              style={{ color: dark ? '#fff' : 'var(--color-text-primary)' }}
            >
              LEAGUE <span style={{ color: ACCENT }}>H5</span>
            </span>
          </Link>

          {/* Navigation principale */}
          <nav
            className="hidden md:flex items-center gap-1 p-1 rounded-full border transition-colors duration-300"
            style={{ background: dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)', borderColor: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
            aria-label="Navigation publique"
          >
            {navItems.map(({ to, label, icon: Icon }) => {
              const isActive = to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(to)

              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-200 font-['Barlow_Condensed'] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8F135] ${isActive
                    ? 'text-[#0D1117] bg-[#C8F135]'
                    : dark ? 'text-white/60 hover:text-white hover:bg-white/[0.04]' : 'text-black/60 hover:text-black hover:bg-black/[0.04]'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {/* Bouton thème */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8F135]"
              style={{
                background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
              }}
              title={dark ? 'Mode clair' : 'Mode sombre'}
              aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Bouton connexion */}
            <Link
              to="/auth/login"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#0D1117] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(200,241,53,0.35)] font-['Barlow_Condensed'] uppercase tracking-wider"
              style={{ backgroundColor: ACCENT }}
            >
              <LogIn className="w-3.5 h-3.5" strokeWidth={2.5} />
              Connexion
            </Link>
          </div>
        </div>

        {/* Mobile top nav removed, now handled as fixed bottom bar */}
      </header>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-0 pb-[calc(env(safe-area-inset-bottom)+64px)] md:pb-[env(safe-area-inset-bottom)]">
        {children}
      </main>

      {/* ── MOBILE BOTTOM NAVIGATION (PWA friendly) ────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl flex justify-around items-center px-6 py-2 transition-colors duration-300 pb-[calc(env(safe-area-inset-bottom)+8px)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]" style={{ borderColor: 'var(--header-border)', backgroundColor: dark ? 'rgba(13,17,23,0.9)' : 'rgba(255,255,255,0.9)' }}>
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-1 px-3 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8F135] rounded-lg"
              style={{ color: isActive ? '#C8F135' : dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider font-['Barlow_Condensed']">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      {!hideFooter && (
        <footer className="border-t py-8 mt-12 transition-colors duration-300 pb-[calc(env(safe-area-inset-bottom)+2rem)]" style={{ borderColor: 'var(--header-border)', backgroundColor: dark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)' }}>
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">

              <div className="flex items-center gap-2.5 group">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center border" style={{ background: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', borderColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ACCENT }} />
                </div>
                <span className="text-xs font-bold tracking-widest font-['Barlow_Condensed']" style={{ color: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                  LEAGUE H5
                </span>
              </div>

              <div className="flex items-center gap-6">
                {navItems.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className="text-xs hover:text-[#C8F135] transition-colors"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              <p className="text-[11px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                © 2026 League H5 · Tous droits réservés
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}