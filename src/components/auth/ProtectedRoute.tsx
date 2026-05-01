import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { PageLoader } from '@/components/ui/LoadingSpinner'

export function ProtectedRoute() {
  const { session, isLoading } = useAuth()

  // Si on a une session, on laisse passer même si le profil charge encore
  if (isLoading && !session) return <PageLoader />
  if (!session) return <Navigate to="/auth/login" replace />

  return <Outlet />
}
