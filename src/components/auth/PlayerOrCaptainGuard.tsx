import { useEffect, useRef } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageLoader } from '@/components/ui/LoadingSpinner'

/**
 * Route guard accessible uniquement aux joueurs, capitaines et administrateurs.
 * Les spectateurs (et les utilisateurs non connectés) sont redirigés vers /dashboard.
 */
export function PlayerOrCaptainGuard() {
  const { session, profile, role, isLoading, isProfileLoading } = useAuth()
  const navigate = useNavigate()

  // Use a ref to avoid calling navigate twice on re-renders
  const redirected = useRef(false)

  useEffect(() => {
    if (redirected.current) return
    if (isLoading || isProfileLoading) return
    if (!session) {
      redirected.current = true
      navigate('/auth/login', { replace: true })
      return
    }
    if (profile && role && role !== 'spectator') {
      // Authorised — let the component render
      return
    }
    // Spectator (or unknown role) → deny access
    redirected.current = true
    navigate('/dashboard', { replace: true })
  }, [isLoading, isProfileLoading, session, profile, role, navigate])

  // ── Loading states ──────────────────────────────────────────────
  if (isLoading) return <PageLoader />
  if (isProfileLoading) return <PageLoader />

  // ── Not authenticated ───────────────────────────────────────────
  if (!session) return <PageLoader />

  // ── Authorised role → render children ───────────────────────────
  if (profile && role && role !== 'spectator') return <Outlet />

  // ── Fallback while redirect fires ───────────────────────────────
  return <PageLoader />
}
