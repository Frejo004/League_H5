/**
 * Lazy loader for the Metered WebRTC SDK.
 *
 * The SDK is no longer loaded synchronously in index.html.
 * It is loaded on demand when the user actually starts or watches a live
 * broadcast, which dramatically improves initial page load performance.
 */

const PRIMARY_SRC = 'https://cdn.metered.ca/sdk/video/1.4.6/sdk.min.js'
const FALLBACK_SRC = 'https://cdn.jsdelivr.net/npm/@metered-ca/video@1.4.6/dist/sdk.min.js'

let loadingPromise: Promise<boolean> | null = null

export function loadMeteredSdk(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.Metered?.Meeting) return Promise.resolve(true)
  if (loadingPromise) return loadingPromise

  loadingPromise = new Promise<boolean>((resolve) => {
    const inject = (src: string, isFallback = false) => {
      const script = document.createElement('script')
      script.src = src
      script.async = true
      script.onload = () => resolve(Boolean(window.Metered?.Meeting))
      script.onerror = () => {
        if (!isFallback) {
          console.warn('[Metered] CDN principal échoué, tentative sur jsdelivr...')
          inject(FALLBACK_SRC, true)
        } else {
          console.error('[Metered] Échec du chargement du SDK.')
          resolve(false)
        }
      }
      document.head.appendChild(script)
    }
    inject(PRIMARY_SRC)
  })

  return loadingPromise
}
