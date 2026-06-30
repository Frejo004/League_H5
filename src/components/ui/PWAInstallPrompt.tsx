/**
 * PWAInstallPrompt — Invite à installer l'app sur iOS et Android
 *
 * iOS (Safari) : affiche un banner "Ajouter à l'écran d'accueil" avec instructions
 * Android (Chrome) : utilise l'événement beforeinstallprompt natif
 *
 * Affiché une seule fois, mémorisé dans localStorage.
 */
import { useState, useEffect } from 'react'
import { X, Share, Plus } from 'lucide-react'

const LS_KEY = 'lh5_pwa_dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

export function PWAInstallPrompt() {
  const [show, setShow] = useState(false)
  const isIos = isIOS()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Ne pas afficher si déjà installé ou déjà refusé
    if (isInStandaloneMode()) return
    if (localStorage.getItem(LS_KEY)) return

    if (isIos) {
      // iOS : afficher après 3s
      const t = setTimeout(() => setShow(true), 3000)
      return () => clearTimeout(t)
    } else {
      // Android/Chrome : écouter l'événement natif
      const handler = (e: Event) => {
        e.preventDefault()
        setDeferredPrompt(e as BeforeInstallPromptEvent)
        setShow(true)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [isIos])

  const dismiss = () => {
    setShow(false)
    localStorage.setItem(LS_KEY, '1')
  }

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        localStorage.setItem(LS_KEY, '1')
      }
      setDeferredPrompt(null)
      setShow(false)
    }
  }

  if (!show) return null

  return (
    <div
      className="fixed bottom-20 lg:bottom-6 left-4 right-4 lg:left-auto lg:right-6 lg:w-80 z-[9998]"
      style={{ animation: 'msgSlideIn 0.3s ease-out both' }}
    >
      <div
        className="relative rounded-2xl p-4 shadow-2xl"
        style={{
          backgroundColor: '#161B22',
          border: '1px solid rgba(200,241,53,0.3)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(200,241,53,0.1)',
        }}
      >
        {/* Barre verte en haut */}
        <div className="absolute top-0 left-4 right-4 h-0.5 rounded-full bg-[#C8F135]" />

        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
          aria-label="Fermer"
        >
          <X size={14} />
        </button>

        <div className="flex items-start gap-3 pr-6">
          {/* Logo */}
          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-[#C8F135]/10 flex items-center justify-center">
            <img src="/logo-h5.png" alt="League H5" className="w-10 h-10 object-contain" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Installer League H5</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {isIos
                ? 'Accès rapide depuis votre écran d\'accueil'
                : 'Installez l\'app pour un accès rapide'}
            </p>
          </div>
        </div>

        {isIos ? (
          /* Instructions iOS */
          <div className="mt-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <p className="text-xs text-slate-300 leading-relaxed">
              Appuyez sur{' '}
              <span className="inline-flex items-center gap-1 text-[#C8F135] font-semibold">
                <Share size={11} /> Partager
              </span>
              {' '}puis{' '}
              <span className="inline-flex items-center gap-1 text-[#C8F135] font-semibold">
                <Plus size={11} /> Sur l'écran d'accueil
              </span>
            </p>
          </div>
        ) : (
          /* Bouton Android */
          <button
            onClick={install}
            className="mt-3 w-full py-2.5 rounded-xl text-sm font-bold text-[#0D1117] transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#C8F135' }}
          >
            Installer l'application
          </button>
        )}
      </div>
    </div>
  )
}
