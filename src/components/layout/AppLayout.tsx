import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import { useTheme } from '@/hooks/useTheme'
import { useMemo } from 'react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ChatToastProvider } from '@/components/ui/ChatToastProvider'
import { PWAInstallPrompt } from '@/components/ui/PWAInstallPrompt'
import { NetworkStatus } from '@/components/ui/NetworkStatus'
import { KeyboardShortcutsHelp } from '@/components/ui/KeyboardShortcutsHelp'
import { PushNotificationBanner } from '@/components/ui/PushNotificationBanner'
import { useChatUnreadRealtime } from '@/hooks/useChatUnread'
import { useMyPresence } from '@/hooks/usePresence'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useAuth } from '@/hooks/useAuth'

// ── Config background par page ────────────────────────────────────────────────

interface PageBg {
  accent: string
  glow?: string
  pattern: 'pitch' | 'hexagon' | 'net' | 'dots' | 'lines' | 'none'
}

const PAGE_BACKGROUNDS: Record<string, PageBg> = {
  '/':           { accent: '#2563eb', glow: '#22c55e', pattern: 'pitch'   },
  '/standings':  { accent: '#f59e0b', glow: '#f59e0b', pattern: 'lines'   },
  '/matches':    { accent: '#3b82f6', glow: '#6366f1', pattern: 'net'     },
  '/scorers':    { accent: '#f97316', glow: '#ef4444', pattern: 'hexagon' },
  '/teams':      { accent: '#8b5cf6', glow: '#6366f1', pattern: 'dots'    },
  '/players':    { accent: '#06b6d4', glow: '#0ea5e9', pattern: 'dots'    },
  '/stats':      { accent: '#22c55e', glow: '#16a34a', pattern: 'lines'   },
  '/admin':      { accent: '#64748b', glow: '#475569', pattern: 'none'    },
  '/captain':    { accent: '#f59e0b', glow: '#d97706', pattern: 'hexagon' },
  '/my-stats':   { accent: '#f97316', glow: '#ef4444', pattern: 'hexagon' },
  '/my-team':    { accent: '#3b82f6', glow: '#6366f1', pattern: 'dots'    },
  '/profile':    { accent: '#2563eb', glow: '#7c3aed', pattern: 'dots'    },
}

const PATTERNS: Record<string, string> = {
  pitch: `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
    <circle cx='80' cy='80' r='36' stroke='rgba(255,255,255,0.025)' stroke-width='1' fill='none'/>
    <line x1='80' y1='0' x2='80' y2='160' stroke='rgba(255,255,255,0.018)' stroke-width='1'/>
    <line x1='0' y1='80' x2='160' y2='80' stroke='rgba(255,255,255,0.018)' stroke-width='1'/>
    <rect x='20' y='50' width='40' height='60' stroke='rgba(255,255,255,0.02)' stroke-width='1' fill='none'/>
    <rect x='100' y='50' width='40' height='60' stroke='rgba(255,255,255,0.02)' stroke-width='1' fill='none'/>
    <circle cx='80' cy='80' r='2' fill='rgba(255,255,255,0.04)'/>
  </svg>`,
  hexagon: `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='115'>
    <polygon points='50,5 95,30 95,85 50,110 5,85 5,30'
      stroke='rgba(255,255,255,0.025)' stroke-width='1' fill='none'/>
  </svg>`,
  net: `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'>
    <line x1='0' y1='0' x2='48' y2='48' stroke='rgba(255,255,255,0.022)' stroke-width='0.8'/>
    <line x1='48' y1='0' x2='0' y2='48' stroke='rgba(255,255,255,0.022)' stroke-width='0.8'/>
    <line x1='24' y1='0' x2='24' y2='48' stroke='rgba(255,255,255,0.015)' stroke-width='0.8'/>
    <line x1='0' y1='24' x2='48' y2='24' stroke='rgba(255,255,255,0.015)' stroke-width='0.8'/>
  </svg>`,
  dots: `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'>
    <circle cx='16' cy='16' r='1.2' fill='rgba(255,255,255,0.04)'/>
  </svg>`,
  lines: `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'>
    <line x1='0' y1='60' x2='60' y2='0' stroke='rgba(255,255,255,0.025)' stroke-width='1'/>
  </svg>`,
  none: '',
}

// Light mode patterns (darker strokes on light bg)
const PATTERNS_LIGHT: Record<string, string> = {
  pitch: `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>
    <circle cx='80' cy='80' r='36' stroke='rgba(0,0,0,0.04)' stroke-width='1' fill='none'/>
    <line x1='80' y1='0' x2='80' y2='160' stroke='rgba(0,0,0,0.03)' stroke-width='1'/>
    <line x1='0' y1='80' x2='160' y2='80' stroke='rgba(0,0,0,0.03)' stroke-width='1'/>
    <rect x='20' y='50' width='40' height='60' stroke='rgba(0,0,0,0.03)' stroke-width='1' fill='none'/>
    <rect x='100' y='50' width='40' height='60' stroke='rgba(0,0,0,0.03)' stroke-width='1' fill='none'/>
  </svg>`,
  hexagon: `<svg xmlns='http://www.w3.org/2000/svg' width='100' height='115'>
    <polygon points='50,5 95,30 95,85 50,110 5,85 5,30'
      stroke='rgba(0,0,0,0.04)' stroke-width='1' fill='none'/>
  </svg>`,
  net: `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'>
    <line x1='0' y1='0' x2='48' y2='48' stroke='rgba(0,0,0,0.035)' stroke-width='0.8'/>
    <line x1='48' y1='0' x2='0' y2='48' stroke='rgba(0,0,0,0.035)' stroke-width='0.8'/>
    <line x1='24' y1='0' x2='24' y2='48' stroke='rgba(0,0,0,0.025)' stroke-width='0.8'/>
    <line x1='0' y1='24' x2='48' y2='24' stroke='rgba(0,0,0,0.025)' stroke-width='0.8'/>
  </svg>`,
  dots: `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'>
    <circle cx='16' cy='16' r='1.2' fill='rgba(0,0,0,0.06)'/>
  </svg>`,
  lines: `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'>
    <line x1='0' y1='60' x2='60' y2='0' stroke='rgba(0,0,0,0.04)' stroke-width='1'/>
  </svg>`,
  none: '',
}

function getPageBg(pathname: string): PageBg {
  if (PAGE_BACKGROUNDS[pathname]) return PAGE_BACKGROUNDS[pathname]
  const prefix = Object.keys(PAGE_BACKGROUNDS)
    .filter(k => k !== '/' && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return PAGE_BACKGROUNDS[prefix ?? '/'] ?? PAGE_BACKGROUNDS['/']
}

function patternDataUrl(pattern: string, isLight: boolean): string {
  const map = isLight ? PATTERNS_LIGHT : PATTERNS
  if (pattern === 'none' || !map[pattern]) return ''
  return `url("data:image/svg+xml,${encodeURIComponent(map[pattern])}")`
}

// ── Layout ────────────────────────────────────────────────────────────────────

export function AppLayout() {
  const location = useLocation()
  const { profile } = useAuth()
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'
  const bg = getPageBg(location.pathname)

  // Realtime unread counts — monté une seule fois ici pour éviter les doublons
  useChatUnreadRealtime(profile?.id)

  // Présence — publie et maintient le statut en ligne de l'utilisateur courant
  useMyPresence(profile?.id)

  // Raccourcis clavier globaux
  const { showHelp, setShowHelp } = useKeyboardShortcuts()

  const bgColor = isLight ? '#f8fafc' : '#0D1117'
  const gradientBase = isLight ? '#f1f5f9' : '#080C12'

  // Mémoriser les calculs de gradient pour éviter les recalculs inutiles
  const gradientStyle = useMemo(() => ({
    background: [
      `radial-gradient(ellipse 55% 45% at 100% 0%, ${bg.accent}${isLight ? '0a' : '12'} 0%, transparent 65%)`,
      bg.glow
        ? `radial-gradient(ellipse 40% 35% at 0% 100%, ${bg.glow}${isLight ? '06' : '08'} 0%, transparent 60%)`
        : '',
      `linear-gradient(180deg, ${bgColor} 0%, ${gradientBase} 100%)`,
    ].filter(Boolean).join(', '),
  }), [bg.accent, bg.glow, isLight, bgColor, gradientBase])

  // Mémoriser le pattern URL
  const patternUrl = useMemo(
    () => bg.pattern !== 'none' ? patternDataUrl(bg.pattern, isLight) : '',
    [bg.pattern, isLight]
  )

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ backgroundColor: bgColor, transition: 'background-color 0.3s ease' }}
    >
      {/* Header full-width */}
      <Header />

      {/* Zone de contenu avec background de page */}
      <div className="relative flex-1 overflow-hidden">

        {/* Gradient accent */}
        <div
          className="pointer-events-none absolute inset-0 z-0 transition-all duration-700"
          style={gradientStyle}
        />

        {/* Pattern SVG */}
        {bg.pattern !== 'none' && (
          <div
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              backgroundImage: patternUrl,
              backgroundRepeat: 'repeat',
            }}
          />
        )}

        <main
          key={location.pathname}
          className="relative z-10 p-3 lg:p-6 pb-20 lg:pb-6 animate-fade-in-up"
          style={{ animationDuration: '200ms', animationFillMode: 'both' }}
        >
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Notifications toast chat — global, hors du flux de page */}
      <ChatToastProvider />

      {/* PWA install prompt — iOS et Android */}
      <PWAInstallPrompt />

      {/* Statut réseau — banner hors-ligne + toast reconnexion */}
      <NetworkStatus />

      {/* Aide raccourcis clavier */}
      {showHelp && <KeyboardShortcutsHelp onClose={() => setShowHelp(false)} />}

      {/* Invitation à activer les notifications push */}
      <PushNotificationBanner />
    </div>
  )
}
