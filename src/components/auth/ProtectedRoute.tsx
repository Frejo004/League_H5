import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PageLoader } from '@/components/ui/LoadingSpinner'

export function ProtectedRoute() {
  const { session, isLoading } = useAuth()

  // ✅ 1. Attendre la fin de l'initialisation
  if (isLoading) return <PageLoader />

  // ✅ 2. Seulement ensuite vérifier la session
  if (!session) return <Navigate to="/auth/login" replace />

  return <Outlet />
}