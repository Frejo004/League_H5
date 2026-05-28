import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { useTheme } from '@/hooks/useTheme' // Import the useTheme hook
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { router } from '@/router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

export default function App() {
  // Initialize and apply theme at the root of the application
  // This ensures that the 'data-theme' attribute on <html> is updated whenever the theme changes.
  useTheme();
  return (
    <ErrorBoundary message="L'application a rencontré une erreur critique. Rechargez la page.">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
