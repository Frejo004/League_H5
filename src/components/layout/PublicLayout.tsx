import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Trophy, Home, LogIn, Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

const ACCENT = '#C8F135'

const THEME_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,700&display=swap');

  .mr {
    --accent:         #C8F135;
    --accent-dim:     rgba(200,241,53,.12);
    --accent-border:  rgba(200,241,53,.28);

    /* light defaults */
    --bg:             #eef0f4;
    --bg-surface:     #ffffff;
    --bg-surface-h:   #f6f8fb;
    --bg-pill:        rgba(0,0,0,.05);
    --bg-pill-h:      rgba(0,0,0,.09);
    --bg-tabs:        rgba(0,0,0,.04);
    --bg-tab-on:      #ffffff;

    --bd:             rgba(0,0,0,.09);
    --bd-card:        rgba(0,0,0,.08);

    --t1:             #0d1117;
    --t2:             #4b5563;
    --tm:             #9ca3af;
    --t-dim:          #d1d5db;

    --sh-card:   0 1px 6px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.05);
    --sh-hover:  0 6px 28px rgba(0,0,0,.13);
    --sh-live:   0 0 18px rgba(239,68,68,.2);

    transition: background .35s ease;
  }

  .mr.dark {
    --bg:            #080b12;
    --bg-surface:    rgba(255,255,255,.025);
    --bg-surface-h:  rgba(255,255,255,.045);
    --bg-pill:       rgba(255,255,255,.04);
    --bg-pill-h:     rgba(255,255,255,.08);
    --bg-tabs:       rgba(255,255,255,.03);
    --bg-tab-on:     rgba(255,255,255,.08);

    --bd:            rgba(255,255,255,.07);
    --bd-card:       rgba(255,255,255,.06);

    --t1:            #f1f5f9;
    --t2:            #94a3b8;
    --tm:            #475569;
    --t-dim:         #1e293b;

    --sh-card:  0 2px 10px rgba(0,0,0,.35);
    --sh-hover: 0 8px 30px rgba(0,0,0,.55);
    --sh-live:  0 0 20px rgba(239,68,68,.22);
  }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ci { animation: cardIn .28s ease both; }

  @keyframes liveRing {
    0%   { box-shadow: 0 0 0 0   rgba(239,68,68,.45); }
    70%  { box-shadow: 0 0 0 7px rgba(239,68,68,0); }
    100% { box-shadow: 0 0 0 0   rgba(239,68,68,0); }
  }
  .lr { animation: liveRing 2s ease-out infinite; }

  @keyframes spinIn {
    from { transform: rotate(-80deg) scale(.5); opacity: 0; }
    to   { transform: rotate(0) scale(1);       opacity: 1; }
  }
  .si { animation: spinIn .2s ease both; }

  .ns { scrollbar-width: none; }
  .ns::-webkit-scrollbar { display: none; }
`

interface PublicLayoutProps {
  children: React.ReactNode
  hideFooter?: boolean
}

export function PublicLayout({ children, hideFooter = false }: PublicLayoutProps) {
  const location = useLocation()
  const { profile } = useAuth()
  const logoLink = profile ? '/dashboard' : '/'

  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const s = localStorage.getItem('mr-theme')
    return s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const handleTheme = () => {
      const s = localStorage.getItem('mr-theme')
      setDark(s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
    window.addEventListener('theme-changed', handleTheme)
    return () => window.removeEventListener('theme-changed', handleTheme)
  }, [])

  const toggleTheme = () => {
    const currentTheme = localStorage.getItem('mr-theme')
    const isDark = currentTheme ? currentTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    const newDark = !isDark
    
    localStorage.setItem('mr-theme', newDark ? 'dark' : 'light')
    setDark(newDark)
    window.dispatchEvent(new Event('theme-changed'))
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const navItems = [
    { to: '/', label: 'Accueil', icon: Home },
    { to: '/public/matches', label: 'Matchs', icon: Trophy },
  ]

  return (
    <div className={`mr ${dark ? 'dark' : ''} min-h-[100dvh] flex flex-col selection:bg-[#C8F135] selection:text-[#0D1117] transition-colors duration-300`} style={{ background: 'var(--bg)', color: 'var(--t1)' }}>
      <style>{THEME_STYLE}</style>

      {/* ── PUBLIC HEADER ─────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-xl transition-colors duration-300 pt-[env(safe-area-inset-top)] ${dark ? 'border-white/[0.06] bg-[#0D1117]/80' : 'border-black/[0.06] bg-[#eef0f4]/80'}`}>
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
            className={`hidden md:flex items-center gap-1 p-1 rounded-full border transition-colors duration-300 ${dark ? 'bg-white/[0.02] border-white/[0.04]' : 'bg-black/[0.02] border-black/[0.04]'}`}
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
              className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all duration-300 ${
                dark ? 'bg-white/[0.04] border-white/[0.08] text-white/70 hover:text-white hover:bg-white/[0.08]' 
                     : 'bg-black/[0.04] border-black/[0.08] text-black/70 hover:text-black hover:bg-black/[0.08]'
              }`}
              title={dark ? 'Mode clair' : 'Mode sombre'}
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
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-50 border-t backdrop-blur-xl flex justify-around items-center px-6 py-2 transition-colors duration-300 pb-[calc(env(safe-area-inset-bottom)+8px)] ${dark ? 'border-white/[0.06] bg-[#0D1117]/90' : 'border-black/[0.06] bg-white/90'} shadow-[0_-4px_20px_rgba(0,0,0,0.05)]`}>
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors duration-200 ${isActive ? 'text-[#C8F135]' : dark ? 'text-white/40' : 'text-black/40'}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase tracking-wider font-['Barlow_Condensed']">{label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      {!hideFooter && (
        <footer className={`border-t py-8 mt-12 transition-colors duration-300 pb-[calc(env(safe-area-inset-bottom)+2rem)] ${dark ? 'border-white/[0.04] bg-white/[0.01]' : 'border-black/[0.04] bg-black/[0.01]'}`}>
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">

              <div className="flex items-center gap-2.5 group">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${dark ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-black/[0.04] border-black/[0.08]'}`}>
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ACCENT }} />
                </div>
                <span className={`text-xs font-bold tracking-widest font-['Barlow_Condensed'] ${dark ? 'text-white/40' : 'text-black/40'}`}>
                  LEAGUE H5
                </span>
              </div>

              <div className="flex items-center gap-6">
                {navItems.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`text-xs hover:text-[#C8F135] transition-colors ${dark ? 'text-slate-500' : 'text-slate-600'}`}
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
      )}
    </div>
  )
}