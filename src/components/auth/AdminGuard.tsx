import { useEffect, useRef } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageLoader } from '@/components/ui/LoadingSpinner'

/**
 * Route guard accessible uniquement aux administrateurs.
 * Redirige vers /dashboard pour tout autre rôle.
 */
export function AdminGuard() {
  const { session, profile, isAdmin, isLoading, isProfileLoading } = useAuth()
  const navigate = useNavigate()
  const redirected = useRef(false)

  useEffect(() => {
    if (redirected.current) return
    if (isLoading || isProfileLoading) return

    if (!session) {
      redirected.current = true
      navigate('/auth/login', { replace: true })
      return
    }

    if (profile && isAdmin) {
      // Autorisé — laisser rendre
      return
    }

    if (profile && !isAdmin) {
      redirected.current = true
      navigate('/dashboard', { replace: true })
    }
  }, [isLoading, isProfileLoading, session, profile, isAdmin, navigate])

  if (isLoading || isProfileLoading) return <PageLoader />
  if (!session) return <PageLoader />
  if (profile && isAdmin) return <Outlet />

  // Fallback pendant la redirection
  return <PageLoader />
}
