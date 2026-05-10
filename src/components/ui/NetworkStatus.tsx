/**
 * NetworkStatus — Banner hors-ligne + toast reconnexion
 * Monté une seule fois dans AppLayout
 */
import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { WifiOff, Wifi } from 'lucide-react'

export function NetworkStatus() {
  const { isOnline, wasOffline } = useNetworkStatus()

  return (
    <>
      {/* Banner hors-ligne — fixé en haut */}
      {!isOnline && (
        <div
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2 text-sm font-semibold"
          style={{
            backgroundColor: '#dc2626',
            color: '#fff',
            animation: 'msgSlideIn 0.3s ease-out both',
          }}
          role="alert"
          aria-live="assertive"
        >
          <WifiOff size={14} />
          Connexion perdue — certaines fonctionnalités sont indisponibles
        </div>
      )}

      {/* Toast reconnexion */}
      {wasOffline && isOnline && (
        <div
          className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-2xl"
          style={{
            backgroundColor: '#16a34a',
            color: '#fff',
            animation: 'msgSlideIn 0.3s ease-out both',
          }}
          role="status"
          aria-live="polite"
        >
          <Wifi size={14} />
          Connexion rétablie
        </div>
      )}
    </>
  )
}
