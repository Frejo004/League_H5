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
  // Attendre que le profil soit chargé pour éviter de montrer le dashboard
  // avant de détecter qu'un utilisateur est spectateur
  if (isProfileLoading) return <PageLoader />

  // 4. Session valide mais profil absent après le chargement initial
  // Cela peut arriver si :
  // - La requête a échoué (réseau absent)
  // - Le profil n'existe pas encore (cas rare)
  if (!profile) {
    // Si on est encore en train de charger, attendre
    if (isLoading || isProfileLoading) return <PageLoader />
    // Sinon, rediriger vers login
    return <Navigate to="/auth/login" replace />
  }

  // 5. Rôles non-spectateurs → accès direct
  if (profile.role !== 'spectator') return <Outlet />

  // ── Spectateur ────────────────────────────────────────────

  // 6. Attendre la saison active
  if (!seasonFetched || seasonLoading) return <PageLoader />

  // 7. Pas de saison → modal
  if (!season) return <PendingApprovalModal />

  // 8. Attendre la demande spectateur
  if (!spectatorFetched || spectatorLoading) return <PageLoader />

  // 9. Non approuvé → modal
  if (!spectatorRequest || spectatorRequest.status !== 'approved') {
    return <PendingApprovalModal />
  }

  // 10. Spectateur approuvé → accès
  return <Outlet />
}