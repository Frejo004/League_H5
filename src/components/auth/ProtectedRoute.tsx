import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMySpectatorRequest } from '@/hooks/useSpectators'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { PendingApprovalModal } from '@/components/auth/PendingApprovalModal'

export function ProtectedRoute() {
  const { session, profile, isLoading, isProfileLoading } = useAuth()

  const isSpectator = profile?.role === 'spectator'

  const { data: season, isLoading: seasonLoading, isFetched: seasonFetched } = useActiveSeason()
  const { data: spectatorRequest, isLoading: spectatorLoading, isFetched: spectatorFetched } =
    useMySpectatorRequest(
      isSpectator ? profile!.id : undefined,
      isSpectator && season?.id ? season.id : undefined,
    )

  // 1. Initialisation auth en cours
  if (isLoading) return <PageLoader />

  // 2. Pas de session → login
  if (!session) return <Navigate to="/auth/login" replace />

  // 3. Profil en cours de chargement (bootstrap ou token refresh)
  //    → attendre pour éviter le flash "spectateur par défaut"
  if (isProfileLoading || !profile) return <PageLoader />

  // 4. Rôles non-spectateurs → accès direct
  if (profile.role !== 'spectator') return <Outlet />

  // ── Spectateur ────────────────────────────────────────────

  // 5. Attendre la saison active
  if (!seasonFetched || seasonLoading) return <PageLoader />

  // 6. Pas de saison → modal
  if (!season) return <PendingApprovalModal />

  // 7. Attendre la demande spectateur
  if (!spectatorFetched || spectatorLoading) return <PageLoader />

  // 8. Non approuvé → modal
  if (!spectatorRequest || spectatorRequest.status !== 'approved') {
    return <PendingApprovalModal />
  }

  // 9. Spectateur approuvé → accès
  return <Outlet />
}
