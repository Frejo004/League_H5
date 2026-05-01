import type { ReactNode } from 'react'
import bgImage from '@/assets/leagueH5-bg_login.jpg'

interface AuthLayoutProps {
  children: ReactNode
  /** Content shown in the left hero panel (desktop only) */
  hero?: ReactNode
}

export function AuthLayout({ children, hero }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex bg-surface">

      {/* ── Left hero panel (desktop) ── */}
      <div
        className="hidden lg:flex flex-col flex-1 relative overflow-hidden"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
        }}
      >
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-surface/60" />

        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-primary-400/10 blur-xl animate-pulse"
              style={{
                width: `${80 + i * 40}px`,
                height: `${80 + i * 40}px`,
                top: `${10 + i * 15}%`,
                left: `${5 + i * 12}%`,
                animationDelay: `${i * 0.7}s`,
                animationDuration: `${3 + i}s`,
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-primary-500 rounded-xl blur-md opacity-60" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-700 rounded-xl flex items-center justify-center shadow-glow">
                <span className="text-xl">⚽</span>
              </div>
            </div>
            <span className="text-white font-bold text-lg tracking-wide">League H5</span>
          </div>

          {/* Hero text */}
          <div className="flex-1 flex flex-col justify-center max-w-md">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                               bg-primary-500/20 border border-primary-500/30
                               text-primary-400 text-xs font-semibold uppercase tracking-widest mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
                Saison en cours
              </span>
            </div>
            <h1 className="text-5xl font-black text-white leading-tight tracking-tight mb-4">
              La ligue<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-300">
                interne H5
              </span>
            </h1>
            <p className="text-slate-300 text-lg leading-relaxed">
              Suivez les matchs, classements et statistiques de votre ligue de football à 5.
            </p>

            {/* Stats row */}
            <div className="flex items-center gap-6 mt-8">
              {[
                { value: '5v5', label: 'Format' },
                { value: '100%', label: 'Compétitif' },
                { value: '⚡', label: 'Temps réel' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom quote */}
          <div className="border-t border-white/10 pt-6">
            <p className="text-slate-400 text-sm italic">
              "Le football, c'est simple. Mais jouer simplement, c'est la chose la plus difficile."
            </p>
            <p className="text-slate-500 text-xs mt-1">— Johan Cruyff</p>
          </div>
        </div>

        {/* Custom hero override */}
        {hero}
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-col w-full lg:w-[480px] xl:w-[520px] flex-shrink-0 relative">
        {/* Mobile background */}
        <div
          className="lg:hidden absolute inset-0"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
        </div>

        {/* Desktop right panel bg */}
        <div className="hidden lg:block absolute inset-0 bg-surface/95 backdrop-blur-sm border-l border-surface-border/30" />

        {/* Ambient glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/20 to-transparent" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary-600/8 rounded-full blur-3xl pointer-events-none" />

        {/* Form content */}
        <div className="relative z-10 flex flex-col flex-1 items-center justify-center p-8 lg:p-10">
          {children}
        </div>

        {/* Footer */}
        <div className="relative z-10 pb-6 text-center">
          <p className="text-xs text-slate-600">© 2025 League H5 · Tous droits réservés</p>
        </div>
      </div>
    </div>
  )
}
