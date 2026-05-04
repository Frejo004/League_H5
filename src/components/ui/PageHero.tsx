import type { ReactNode } from 'react'
import { clsx } from 'clsx'

/**
 * PageHero — Hero card avec photo Unsplash en fond + pattern de terrain
 *
 * Props :
 *  - imageUrl   : URL de la photo de fond (Unsplash CDN)
 *  - pattern    : motif SVG inline spécifique à la page
 *  - accent     : couleur d'accent (classe Tailwind ou hex)
 *  - title      : titre principal
 *  - subtitle   : sous-titre / saison
 *  - icon       : icône Lucide à gauche du titre
 *  - badge      : badge optionnel (ex: "En cours")
 *  - stats      : tableau de { label, value } affiché en bas du hero
 *  - children   : contenu additionnel (boutons, etc.)
 */

interface HeroStat {
  label: string
  value: string | number
}

interface PageHeroProps {
  imageUrl: string
  pattern?: 'pitch' | 'hexagon' | 'net' | 'dots' | 'lines'
  accentColor?: string
  title: string
  subtitle?: string
  icon?: ReactNode
  badge?: ReactNode
  stats?: HeroStat[]
  children?: ReactNode
  className?: string
  compact?: boolean
}

// ── SVG patterns foot ────────────────────────────────────────────────────────

const PATTERNS: Record<string, string> = {
  // Lignes de terrain
  pitch: `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'>
    <rect width='120' height='120' fill='none'/>
    <circle cx='60' cy='60' r='28' stroke='rgba(255,255,255,0.06)' stroke-width='1' fill='none'/>
    <line x1='60' y1='0' x2='60' y2='120' stroke='rgba(255,255,255,0.04)' stroke-width='1'/>
    <line x1='0' y1='60' x2='120' y2='60' stroke='rgba(255,255,255,0.04)' stroke-width='1'/>
    <circle cx='60' cy='60' r='2' fill='rgba(255,255,255,0.08)'/>
  </svg>`,

  // Hexagones (ballon de foot)
  hexagon: `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='92'>
    <polygon points='40,4 76,24 76,68 40,88 4,68 4,24'
      stroke='rgba(255,255,255,0.05)' stroke-width='1' fill='none'/>
  </svg>`,

  // Filet de but
  net: `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'>
    <line x1='0' y1='0' x2='40' y2='40' stroke='rgba(255,255,255,0.04)' stroke-width='0.8'/>
    <line x1='40' y1='0' x2='0' y2='40' stroke='rgba(255,255,255,0.04)' stroke-width='0.8'/>
    <line x1='20' y1='0' x2='20' y2='40' stroke='rgba(255,255,255,0.03)' stroke-width='0.8'/>
    <line x1='0' y1='20' x2='40' y2='20' stroke='rgba(255,255,255,0.03)' stroke-width='0.8'/>
  </svg>`,

  // Points
  dots: `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'>
    <circle cx='12' cy='12' r='1.5' fill='rgba(255,255,255,0.07)'/>
  </svg>`,

  // Lignes diagonales
  lines: `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'>
    <line x1='0' y1='40' x2='40' y2='0' stroke='rgba(255,255,255,0.04)' stroke-width='1'/>
  </svg>`,
}

function patternUrl(pattern: string) {
  const svg = PATTERNS[pattern] ?? PATTERNS.dots
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

// ── Composant ────────────────────────────────────────────────────────────────

export function PageHero({
  imageUrl,
  pattern = 'dots',
  accentColor = '#2563eb',
  title,
  subtitle,
  icon,
  badge,
  stats,
  children,
  className,
  compact = false,
}: PageHeroProps) {
  return (
    <div className={clsx(
      'relative overflow-hidden rounded-2xl border border-surface-border',
      compact ? 'min-h-[120px]' : 'min-h-[160px]',
      className
    )}>

      {/* ── Photo de fond ── */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-105"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />

      {/* ── Overlays empilés ── */}
      {/* 1. Assombrir la photo */}
      <div className="absolute inset-0 bg-black/65" />
      {/* 2. Gradient directionnel pour lisibilité du texte */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
      {/* 3. Gradient bas pour les stats */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      {/* 4. Accent couleur subtil */}
      <div
        className="absolute inset-0 opacity-20"
        style={{ background: `radial-gradient(ellipse 60% 80% at 0% 50%, ${accentColor}40 0%, transparent 70%)` }}
      />

      {/* ── Pattern SVG terrain ── */}
      <div
        className="absolute inset-0 opacity-100"
        style={{ backgroundImage: patternUrl(pattern), backgroundRepeat: 'repeat' }}
      />

      {/* ── Ligne accent en haut ── */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent 60%)` }}
      />

      {/* ── Contenu ── */}
      <div className={clsx(
        'relative z-10 flex flex-col justify-between h-full',
        compact ? 'p-4' : 'p-5'
      )}>

        {/* Top row : titre + badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0
                           border border-white/10 backdrop-blur-sm"
                style={{ backgroundColor: `${accentColor}30` }}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h1 className={clsx(
                'font-black text-white tracking-tight leading-tight drop-shadow-lg',
                compact ? 'text-xl' : 'text-2xl'
              )}>
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-white/60 mt-0.5 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          {badge && (
            <div className="shrink-0">{badge}</div>
          )}
        </div>

        {/* Bottom row : stats */}
        {stats && stats.length > 0 && (
          <div className="flex items-center gap-5 mt-4 pt-3 border-t border-white/10">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-xl font-black text-white tabular-nums drop-shadow">{s.value}</p>
                <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {children && (
          <div className="mt-3">{children}</div>
        )}
      </div>
    </div>
  )
}
