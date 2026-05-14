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
      'relative overflow-hidden rounded-2xl border border-white/10 group',
      compact ? 'min-h-[130px]' : 'min-h-[180px]',
      className
    )}>
 
       {/* ── Photo de fond ── */}
       <div
         className="absolute inset-0 bg-cover bg-center transition-all duration-1000 group-hover:scale-110 group-hover:rotate-1"
         style={{ backgroundImage: `url(${imageUrl})` }}
       />
 
       {/* ── Overlays empilés ── */}
       {/* 1. Assombrir la photo */}
       <div className="absolute inset-0 bg-black/60 transition-opacity duration-700 group-hover:opacity-50" />
       
       {/* 2. Mesh Gradient animé pour le "wow" effect */}
       <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
       
       {/* 3. Gradient directionnel pour lisibilité du texte */}
       <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
       
       {/* 4. Accent couleur subtil */}
       <div
         className="absolute inset-0 opacity-30"
         style={{ background: `radial-gradient(circle at 0% 50%, ${accentColor}40 0%, transparent 70%)` }}
       />
 
       {/* ── Pattern SVG terrain ── */}
       <div
         className="absolute inset-0 opacity-40 mix-blend-overlay"
         style={{ backgroundImage: patternUrl(pattern), backgroundRepeat: 'repeat' }}
       />
 
       {/* ── Contenu ── */}
       <div className={clsx(
         'relative z-10 flex flex-col justify-between h-full',
         compact ? 'p-5' : 'p-6'
       )}>
 
         {/* Top row : titre + badge */}
         <div className="flex items-start justify-between gap-4">
           <div className="flex items-center gap-4 min-w-0">
             {icon && (
               <div
                 className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0
                            glass-morphism shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
                 style={{ border: `1px solid ${accentColor}40` }}
               >
                 <div style={{ color: accentColor }}>{icon}</div>
               </div>
             )}
             <div className="min-w-0">
               <h1 className={clsx(
                 'font-black text-white tracking-tight leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]',
                 compact ? 'text-2xl' : 'text-3xl'
               )}
               style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                 {title}
               </h1>
               {subtitle && (
                 <p className="text-sm text-white/70 mt-1 font-medium tracking-wide drop-shadow-md">{subtitle}</p>
               )}
             </div>
           </div>
 
           {badge && (
             <div className="shrink-0 animate-fadeIn">{badge}</div>
           )}
         </div>
 
         {/* Bottom row : stats ou enfants */}
         <div className="flex items-end justify-between gap-4 mt-4">
           {stats && stats.length > 0 && (
             <div className="flex items-center gap-6 px-4 py-2.5 rounded-2xl glass-morphism border border-white/5">
               {stats.map((s, i) => (
                 <div key={i} className="text-center">
                   <p className="text-2xl font-black text-white tabular-nums drop-shadow-lg">{s.value}</p>
                   <p className="text-[9px] text-white/50 uppercase tracking-[0.2em] font-black mt-0.5">{s.label}</p>
                 </div>
               ))}
             </div>
           )}
 
           {children && (
             <div className="flex-1 flex justify-end">{children}</div>
           )}
         </div>
       </div>
 
       {/* ── Ligne accent en bas ── */}
       <div
         className="absolute bottom-0 left-0 right-0 h-1 opacity-50"
         style={{ background: `linear-gradient(90deg, ${accentColor}, transparent 80%)` }}
       />
     </div>
  )
}
