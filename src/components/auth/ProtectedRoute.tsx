import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMySpectatorRequest } from '@/hooks/useSpectators'
import { PageLoader } from '@/components/ui/LoadingSpinner'
import { PendingApprovalModal } from '@/components/auth/PendingApprovalModal'

export function ProtectedRoute() {
  const { session, profile, isLoading } = useAuth()
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: spectatorRequest, isLoading: spectatorLoading } = useMySpectatorRequest(
    profile?.role === 'spectator' ? profile?.id : undefined,
    profile?.role === 'spectator' ? season?.id : undefined,
  )

  // 1. Attendre l'initialisation auth
  if (isLoading) return <PageLoader />

  // 2. Pas de session → login
  if (!session) return <Navigate to="/auth/login" replace />

  // 3. Si spectateur, vérifier l'approbation
  if (profile?.role === 'spectator') {
    // Attendre la saison et la demande avant de décider
    if (seasonLoading || spectatorLoading) return <PageLoader />

    // Pas approuvé → modal d'attente (bloque l'accès)
    if (!spectatorRequest || spectatorRequest.status !== 'approved') {
      return <PendingApprovalModal />
    }
  }

  return <Outlet />
}
