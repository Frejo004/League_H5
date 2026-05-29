/**
 * PushNotificationBanner — Invite à activer les notifications push
 * Affiché une seule fois, 5s après le premier chargement
 */
import { useState, useEffect } from 'react'
import { Bell, X, CheckCircle } from 'lucide-react'
import { useNotificationSW } from '@/hooks/useNotificationSW'
import { useAuth } from '@/hooks/useAuth'

const LS_KEY = 'lh5_push_asked'

export function PushNotificationBanner() {
  const { user } = useAuth()
  const { permission, isSupported, requestPermission, isSubscribing } = useNotificationSW(user?.id)
  const [show, setShow] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isSupported || !user) return
    if (permission === 'granted' || permission === 'denied') return
    if (localStorage.getItem(LS_KEY)) return

    const t = setTimeout(() => setShow(true), 5000)
    return () => clearTimeout(t)
  }, [isSupported, permission, user])

  const dismiss = () => {
    setShow(false)
    localStorage.setItem(LS_KEY, '1')
  }

  const handleSubscribe = async () => {
    const granted = await requestPermission()
    if (granted) {
      setSuccess(true)
      setTimeout(dismiss, 1500)
    } else {
      dismiss()
    }
  }

  if (!show) return null

  return (
    <div
      className="fixed bottom-24 lg:bottom-8 left-4 right-4 lg:left-auto lg:right-6 lg:w-80 z-[9990]"
      style={{ animation: 'msgSlideIn 0.3s ease-out both' }}
    >
      <div
        className="relative rounded-2xl p-4 shadow-2xl"
        style={{
          backgroundColor: '#161B22',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        }}
      >
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X size={13} />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="w-10 h-10 rounded-xl bg-primary-600/20 flex items-center justify-center shrink-0">
            {success
              ? <CheckCircle size={18} className="text-green-400" />
              : <Bell size={18} className="text-primary-400" />
            }
          </div>
          <div>
            <p className="text-sm font-bold text-white">
              {success ? 'Notifications activées !' : 'Activer les notifications'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {success
                ? 'Vous recevrez des alertes pour les matchs et résultats.'
                : 'Soyez alerté des matchs, résultats et votes MVP en temps réel.'
              }
            </p>
          </div>
        </div>

        {!success && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-500 transition-colors disabled:opacity-50"
            >
              {isSubscribing ? 'Activation…' : 'Activer'}
            </button>
            <button
              onClick={dismiss}
              className="px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-slate-300 hover:bg-white/8 transition-colors"
            >
              Plus tard
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
