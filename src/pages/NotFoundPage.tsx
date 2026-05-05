import { Link } from 'react-router-dom'
import { Home, Trophy, Calendar, Users } from 'lucide-react'

const QUICK_LINKS = [
  { to: '/',          label: 'Accueil',    icon: Home },
  { to: '/standings', label: 'Classement', icon: Trophy },
  { to: '/matches',   label: 'Matchs',     icon: Calendar },
  { to: '/players',   label: 'Joueurs',    icon: Users },
]

export function NotFoundPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#0D1117' }}
    >
      {/* Glow background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(37,99,235,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative text-center space-y-6 animate-fade-in-up max-w-sm w-full">

        {/* Ball icon animé */}
        <div className="flex justify-center">
          <div className="animate-ball-bounce">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#1e2640" strokeWidth="1.5" fill="#161c2d"/>
              <circle cx="12" cy="12" r="10" stroke="#252f4a" strokeWidth="1"/>
              <path d="M12 2C12 2 9 6 9 12C9 18 12 22 12 22" stroke="#252f4a" strokeWidth="1"/>
              <path d="M2 12H22" stroke="#252f4a" strokeWidth="1"/>
              <path d="M4.5 6.5L12 9L19.5 6.5" stroke="#252f4a" strokeWidth="0.8"/>
              <path d="M4.5 17.5L12 15L19.5 17.5" stroke="#252f4a" strokeWidth="0.8"/>
            </svg>
          </div>
        </div>

        {/* 404 */}
        <div>
          <p
            className="text-[7rem] font-black leading-none tabular-nums"
            style={{
              background: 'linear-gradient(135deg, #1e2640 0%, #252f4a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.05em',
            }}
          >
            404
          </p>
          <h1 className="text-xl font-bold text-white mt-1">Page introuvable</h1>
          <p className="text-slate-500 text-sm mt-2">
            Cette page n'existe pas ou a été déplacée.
          </p>
        </div>

        {/* CTA principal */}
        <Link to="/" className="btn-primary inline-flex items-center gap-2 mx-auto">
          <Home size={15} />
          Retour à l'accueil
        </Link>

        {/* Liens rapides */}
        <div className="pt-2">
          <p className="text-xs text-slate-600 mb-3 uppercase tracking-wider font-semibold">
            Ou accède directement à
          </p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="card-hover flex items-center gap-2.5 px-3 py-2.5"
              >
                <Icon size={14} className="text-slate-500 shrink-0" />
                <span className="text-sm text-slate-300 font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
