import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { useTheme } from '@/hooks/useTheme'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { BetBasketProvider } from '@/components/ui/BetBasketProvider'
import { router } from '@/router'
import { captureException, telemetry } from '@/lib/telemetry'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

export default function App() {
  useTheme()

  // Capture des erreurs globales (window.onerror, unhandledrejection)
  useEffect(() => {
    if (!telemetry.enabled) return
    const onError = (event: ErrorEvent) => {
      captureException(event.error ?? event.message, { source: 'window.onerror' })
    }
    const onRejection = (event: PromiseRejectionEvent) => {
      captureException(event.reason, { source: 'unhandledrejection' })
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return (
    <ErrorBoundary message="L'application a rencontré une erreur critique. Rechargez la page.">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BetBasketProvider>
            <RouterProvider router={router} />
          </BetBasketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
