import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { UpdatePasswordPage } from '@/pages/auth/UpdatePasswordPage'
import { JoinPage } from '@/pages/auth/JoinPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { StandingsPage } from '@/pages/StandingsPage'
import { MatchesPage } from '@/pages/MatchesPage'
import { ScorersPage } from '@/pages/ScorersPage'
import { TeamsPage } from '@/pages/TeamsPage'
import { PlayersPage } from '@/pages/PlayersPage'
import { StatsPage } from '@/pages/StatsPage'
import { BracketPage } from '@/pages/BracketPage'
import { AdminPage } from '@/pages/AdminPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export const router = createBrowserRouter([
  // Auth routes (public)
  {
    path: '/auth/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/signup',
    element: <SignupPage />,
  },
  {
    path: '/auth/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/auth/update-password',
    element: <UpdatePasswordPage />,
  },
  {
    path: '/auth/join',
    element: <JoinPage />,
  },

  // App routes (protected)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/',          element: <DashboardPage /> },
          { path: '/standings', element: <StandingsPage /> },
          { path: '/matches',   element: <MatchesPage /> },
          { path: '/scorers',   element: <ScorersPage /> },
          { path: '/teams',     element: <TeamsPage /> },
          { path: '/players',   element: <PlayersPage /> },
          { path: '/stats',     element: <StatsPage /> },
          { path: '/bracket',   element: <BracketPage /> },
          { path: '/admin',     element: <AdminPage /> },
          { path: '/profile',   element: <ProfilePage /> },
        ],
      },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
])

/** Use this outside React components (e.g. AuthContext) */
export function navigateTo(path: string) {
  router.navigate(path, { replace: true })
}
