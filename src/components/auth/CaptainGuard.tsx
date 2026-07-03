import { useEffect, useRef } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageLoader } from '@/components/ui/LoadingSpinner'

/**
 * Route guard accessible uniquement aux capitaines et administrateurs.
 * Redirige vers /dashboard pour tout autre rôle.
 */
export function CaptainGuard() {
  const { session, profile, isCaptain, isLoading, isProfileLoading } = useAuth()
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

    if (profile && isCaptain) {
      // Autorisé — laisser rendre
      return
    }

    if (profile && !isCaptain) {
      redirected.current = true
      navigate('/dashboard', { replace: true })
    }
  }, [isLoading, isProfileLoading, session, profile, isCaptain, navigate])

  if (isLoading || isProfileLoading) return <PageLoader />
  if (!session) return <PageLoader />
  if (profile && isCaptain) return <Outlet />

  // Fallback pendant la redirection
  return <PageLoader />
}
