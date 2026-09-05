import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { ReactNode } from 'react'
import bgImage from '@/assets/leagueH5-bg_login.jpg'
// ✅ Suppression de l'import mobile inexistant

interface AuthLayoutProps {
  children: ReactNode
  hero?: ReactNode
  stats?: Array<{ value: string; label: string }>
}

export function AuthLayout({ children, hero, stats = defaultStats }: AuthLayoutProps) {
  const { profile } = useAuth()
  const logoLink = profile ? '/dashboard' : '/'

  return (
    <div className="min-h-dvh lg:h-dvh flex flex-col lg:flex-row overflow-x-hidden lg:overflow-hidden bg-linear-to-br from-slate-950 to-slate-900">

      {/* ── Left hero panel (desktop) ── */}
      <div
        className="hidden lg:flex flex-col flex-1 min-w-0 relative overflow-hidden"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          backgroundColor: '#0f172a',
        }}
      >
        <div className="absolute inset-0 bg-linear-to-br from-black/70 via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-transparent to-slate-900/60" />

        <div className="relative z-10 flex flex-col h-full p-8 lg:p-12 xl:p-14">
          <Link to={logoLink} className="flex items-center gap-3 group shrink-0 w-fit">
            <img src="/logo-h5.png" alt="League H5" className="w-10 h-10 object-contain shrink-0 transition-transform group-hover:scale-105 duration-200" />
            <span className="text-white font-bold text-lg tracking-wide drop-shadow-md group-hover:text-primary-300 transition-colors duration-200">
              League H5
            </span>
          </Link>

          <div className="flex-1 flex flex-col justify-center w-full max-w-[36rem]">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full whitespace-nowrap
                               bg-primary-500/20 border border-primary-500/30
                               text-primary-400 text-xs font-semibold uppercase tracking-widest mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                Saison en cours
              </span>
            </div>
            <h1 className="w-full text-4xl lg:text-5xl font-black leading-tight tracking-tight mb-4">
              <span className="text-white drop-shadow-lg">La ligue</span><br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary-400 to-primary-300 drop-shadow-md">
                interne H5
              </span>
            </h1>
            <p className="w-full max-w-[32rem] text-slate-300 text-base lg:text-lg leading-relaxed drop-shadow">
              Suivez les matchs, classements et statistiques de votre ligue de football à 5.
            </p>

            <div className="flex items-center gap-6 mt-8">
              {stats.map((stat, idx) => (
                <div key={idx}>
                  <p className="text-2xl font-black text-white drop-shadow-md">{stat.value}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 mt-auto">
            <p className="text-slate-400 text-sm italic drop-shadow">
              "Le football, c'est simple. Mais jouer simplement, c'est la chose la plus difficile."
            </p>
            <p className="text-slate-500 text-xs mt-1 drop-shadow">— Johan Cruyff</p>
          </div>
        </div>

        {hero && (
          <div className="relative z-10 mt-auto mb-8">
            {hero}
          </div>
        )}
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-col w-full lg:w-[520px] xl:w-[560px] 2xl:w-[600px] shrink-0 relative">
        {/* ✅ Mobile background — réutilise bgImage, pas d'import séparé */}
        <div
          className="lg:hidden absolute inset-0"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/70" />
        </div>

        <div className="hidden lg:block absolute inset-0 bg-slate-900/95 backdrop-blur-sm border-l border-slate-800/30" />

        <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-primary-500/20 to-transparent" />

        <div className="relative z-10 flex flex-col flex-1 items-center justify-center w-full px-6 py-10 sm:px-8 lg:px-14 lg:py-12">
          {children}
        </div>

        <div className="relative z-10 px-6 pb-6 text-center">
          <p className="text-xs text-slate-500">© 2025 League H5 · Tous droits réservés</p>
        </div>
      </div>
    </div>
  )
}

const defaultStats = [
  { value: '5v5', label: 'Format' },
  { value: '100%', label: 'Compétitif' },
  { value: '⚡', label: 'Temps réel' },
]
