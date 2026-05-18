import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Trophy, Home, LogIn } from 'lucide-react'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'

const ACCENT = '#C8F135'

interface PublicLayoutProps {
  children: React.ReactNode
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const location = useLocation()
  const { profile } = useAuth()
  const logoLink = profile ? '/dashboard' : '/'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const navItems = [
    { to: '/', label: 'Accueil', icon: Home },
    { to: '/public/matches', label: 'Matchs', icon: Trophy },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#0D1117] text-slate-100 selection:bg-[#C8F135] selection:text-[#0D1117]">

      {/* ── PUBLIC HEADER ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0D1117]/80 backdrop-blur-xl">
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
              className="text-lg font-black tracking-wider text-white select-none font-['Barlow_Condensed']"
            >
              LEAGUE <span style={{ color: ACCENT }}>H5</span>
            </span>
          </Link>

          {/* Navigation principale */}
          <nav
            className="hidden md:flex items-center gap-1 bg-white/[0.02] border border-white/[0.04] p-1 rounded-full"
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
                  className={`relative flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-all duration-200 font-['Barlow_Condensed'] ${isActive
                    ? 'text-[#0D1117] bg-[#C8F135]'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.04]'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Bouton connexion */}
          <Link
            to="/auth/login"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-[#0D1117] shrink-0 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(200,241,53,0.35)] font-['Barlow_Condensed'] uppercase tracking-wider"
            style={{ backgroundColor: ACCENT }}
          >
            <LogIn className="w-3.5 h-3.5" strokeWidth={2.5} />
            Connexion
          </Link>
        </div>

        {/* Navigation Mobile (Axe de défilement horizontal discret) */}
        <div className="md:hidden flex border-t border-white/[0.04] justify-center overflow-x-auto no-scrollbar">
          <nav className="flex gap-4 px-4 py-2">
            {navItems.map(({ to, label, icon: Icon }) => {
              const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 py-1 text-[11px] font-bold uppercase tracking-wider font-['Barlow_Condensed'] ${isActive ? 'text-[#C8F135]' : 'text-white/40'
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              )
            })}
          </nav>
        </div>
      </header>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <main className="flex-1">
        {children}
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] bg-white/[0.01] py-8 mt-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">

            <div className="flex items-center gap-2.5 group">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/[0.04] border border-white/[0.08]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ACCENT }} />
              </div>
              <span className="text-xs font-bold text-white/40 tracking-widest font-['Barlow_Condensed']">
                LEAGUE H5
              </span>
            </div>

            <div className="flex items-center gap-6">
              {navItems.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="text-xs text-slate-500 hover:text-[#C8F135] transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>

            <p className="text-[11px] text-slate-600 font-medium">
              © 2026 League H5 · Tous droits réservés
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}