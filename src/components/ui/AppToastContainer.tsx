/**
 * AppToastContainer — Rendu des toasts système (erreurs caméra, warnings réseau…)
 * À placer dans le JSX du composant qui utilise useAppToast().
 */
import type { AppToastKind } from '@/hooks/useAppToast'

const KIND_STYLES: Record<AppToastKind, {
  bar: string; iconBg: string; iconText: string; icon: string; border: string
}> = {
  error:   { bar: 'bg-red-500',   iconBg: 'bg-red-500/15',   iconText: 'text-red-400',    icon: '✕', border: 'border-red-500/25' },
  warning: { bar: 'bg-amber-400', iconBg: 'bg-amber-400/15', iconText: 'text-amber-400',  icon: '⚠', border: 'border-amber-400/25' },
  success: { bar: 'bg-[#C8F135]', iconBg: 'bg-[#C8F135]/15', iconText: 'text-[#C8F135]', icon: '✓', border: 'border-[#C8F135]/25' },
  info:    { bar: 'bg-blue-400',  iconBg: 'bg-blue-400/15',  iconText: 'text-blue-400',   icon: 'ℹ', border: 'border-blue-400/25' },
}

interface Toast {
  id: string
  kind: AppToastKind
  message: string
  detail?: string
}

interface AppToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function AppToastContainer({ toasts, onDismiss }: AppToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications système"
    >
      {toasts.map(t => {
        const s = KIND_STYLES[t.kind]
        return (
          <div
            key={t.id}
            className={`pointer-events-auto relative flex items-start gap-3 rounded-2xl border ${s.border} bg-[#0f1420] px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.7)] animate-in slide-in-from-bottom-2 fade-in duration-200`}
          >
            {/* Barre colorée gauche */}
            <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${s.bar}`} />

            {/* Icône */}
            <div className={`shrink-0 w-7 h-7 rounded-lg ${s.iconBg} flex items-center justify-center ml-1`}>
              <span className={`text-sm font-black ${s.iconText}`}>{s.icon}</span>
            </div>

            {/* Texte */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-xs font-black text-white leading-snug">{t.message}</p>
              {t.detail && (
                <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{t.detail}</p>
              )}
            </div>

            {/* Bouton fermer */}
            <button
              onClick={() => onDismiss(t.id)}
              className="shrink-0 text-slate-500 hover:text-white transition-colors mt-0.5"
              aria-label="Fermer"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
