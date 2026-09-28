import { Link } from 'react-router-dom'
import { Home, Trophy, Calendar, Target, Users, BarChart2, Star, BookOpen, Swords, RefreshCw } from 'lucide-react'

const QUICK_LINKS = [
  { to: '/dashboard',  label: 'Accueil',     icon: Home },
  { to: '/standings',  label: 'Classement',  icon: Trophy },
  { to: '/matches',    label: 'Matchs',      icon: Calendar },
  { to: '/scorers',    label: 'Buteurs',     icon: Target },
  { to: '/teams',      label: 'Équipes',     icon: Users },
  { to: '/players',    label: 'Joueurs',     icon: Users },
  { to: '/stats',      label: 'Stats',       icon: BarChart2 },
  { to: '/palmares',   label: 'Palmarès',    icon: Star },
  { to: '/rules',      label: 'Règlement',   icon: BookOpen },
  { to: '/playoffs',   label: 'Playoffs',    icon: Swords },
]

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background decorations — adaptatif au thème via les tokens CSS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Grid pattern */}
        <div className="absolute inset-0"
             style={{
               backgroundImage: 'linear-gradient(var(--color-surface-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-surface-border) 1px, transparent 1px)',
               backgroundSize: '40px 40px',
               opacity: 0.4,
             }} />
      </div>

      <div className="relative text-center space-y-10 max-w-2xl w-full">

        {/* 404 Visual */}
        <div className="space-y-4">
          <div className="relative inline-block">
              <div className="relative rounded-2xl p-6 shadow-sm border"
                 style={{ backgroundColor: 'var(--color-surface-card)', borderColor: 'var(--color-surface-border)' }}>
              <div className="flex items-center justify-center gap-3">
                <div className="w-16 h-16 rounded-xl bg-primary-600 flex items-center justify-center">
                  <span className="text-3xl font-black text-white">4</span>
                </div>

                <div className="w-20 h-20">
                  <svg viewBox="0 0 24 24" fill="none" className="w-full h-full animate-bounce">
                    <circle cx="12" cy="12" r="10" stroke="#C8F135" strokeWidth="1.5" fill="#1F2937"/>
                    <path d="M12 2C12 2 9 6 9 12C9 18 12 22 12 22" stroke="#C8F135" strokeWidth="1.2"/>
                    <path d="M2 12H22" stroke="#C8F135" strokeWidth="1.2"/>
                    <path d="M4.5 6.5L12 9L19.5 6.5" stroke="#C8F135" strokeWidth="0.8"/>
                    <path d="M4.5 17.5L12 15L19.5 17.5" stroke="#C8F135" strokeWidth="0.8"/>
                  </svg>
                </div>

                <div className="w-16 h-16 rounded-xl bg-primary-600 flex items-center justify-center">
                  <span className="text-3xl font-black text-white">4</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
              Page introuvable
            </h1>
            <p className="text-lg max-w-md mx-auto leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Oups ! Cette page n'existe plus ou a été déplacée vers un autre endroit.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold shadow-sm hover:bg-primary-700 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8F135]"
          >
            <Home size={18} />
            Retour à l'accueil
          </Link>

          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border font-semibold transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8F135]"
            style={{
              backgroundColor: 'var(--color-surface-raised)',
              borderColor: 'var(--color-surface-border)',
              color: 'var(--color-text-secondary)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-surface-muted)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-surface-border)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'
            }}
          >
            <RefreshCw size={18} />
            Réactualiser
          </button>
        </div>

        {/* Quick Links */}
        <div className="pt-4">
          <p className="text-xs mb-4 uppercase tracking-widest font-semibold" style={{ color: 'var(--color-text-muted)' }}>
            Ou accède directement à
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group flex flex-col items-center gap-2 px-4 py-4 rounded-xl border transition-all duration-300 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8F135]"
                style={{
                  backgroundColor: 'var(--color-surface-card)',
                  borderColor: 'var(--color-surface-border)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-raised)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--color-surface-muted)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-surface-card)'
                  ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--color-surface-border)'
                }}
              >
                <Icon size={22} className="transition-colors duration-300" style={{ color: 'var(--color-text-muted)' }}
                  onMouseEnter={e => { (e.currentTarget as SVGElement).style.color = '#C8F135' }}
                  onMouseLeave={e => { (e.currentTarget as SVGElement).style.color = 'var(--color-text-muted)' }}
                />
                <span className="text-sm font-medium transition-colors duration-300" style={{ color: 'var(--color-text-secondary)' }}>
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
