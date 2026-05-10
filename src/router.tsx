import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { UpdatePasswordPage } from '@/pages/auth/UpdatePasswordPage'
import { JoinPage } from '@/pages/auth/JoinPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { StandingsPage } from '@/pages/StandingsPage'
import { MatchesPage } from '@/pages/MatchesPage'
import { MatchDetailPage } from '@/pages/MatchDetailPage'
import { ScorersPage } from '@/pages/ScorersPage'
import { TeamsPage } from '@/pages/TeamsPage'
import { TeamDetailPage } from '@/pages/TeamDetailPage'
import { PlayersPage } from '@/pages/PlayersPage'
import { StatsPage } from '@/pages/StatsPage'
import { AdminPage } from '@/pages/AdminPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { CaptainPage } from '@/pages/CaptainPage'
import { PlayerProfilePage } from '@/pages/PlayerProfilePage'
import { MyStatsPage } from '@/pages/MyStatsPage'
import { MyTeamPage } from '@/pages/MyTeamPage'
import { PalmaresPage } from '@/pages/PalmaresPage'
import { RulesPage } from '@/pages/RulesPage'
import { LandingPage } from '@/pages/LandingPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ChatPage } from '@/pages/ChatPage'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export const router = createBrowserRouter(
  [
    // Routes publiques (sans auth)
    { path: '/auth/login',           element: <LoginPage /> },
    { path: '/auth/signup',          element: <SignupPage /> },
    { path: '/auth/reset-password',  element: <ResetPasswordPage /> },
    { path: '/auth/update-password', element: <UpdatePasswordPage /> },
    { path: '/auth/join',            element: <JoinPage /> },
    { path: '/landing',              element: <LandingPage /> },
    { path: '/rules-public',         element: <RulesPage /> },

    // App routes (protected)
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { path: '/',              element: <DashboardPage /> },
            { path: '/standings',     element: <StandingsPage /> },
            { path: '/matches',       element: <MatchesPage /> },
            { path: '/matches/:id',   element: <MatchDetailPage /> },
            { path: '/scorers',       element: <ScorersPage /> },
            { path: '/teams',         element: <TeamsPage /> },
            { path: '/teams/:id',     element: <TeamDetailPage /> },
            { path: '/players',       element: <PlayersPage /> },
            { path: '/players/:id',   element: <PlayerProfilePage /> },
            { path: '/stats',         element: <StatsPage /> },
            { path: '/admin',         element: <AdminPage /> },
            { path: '/captain',       element: <CaptainPage /> },
            { path: '/my-stats',      element: <MyStatsPage /> },
            { path: '/my-team',       element: <MyTeamPage /> },
            { path: '/palmares',      element: <PalmaresPage /> },
            { path: '/rules',         element: <RulesPage /> },
            { path: '/profile',       element: <ProfilePage /> },
            { path: '/chat',          element: <ChatPage /> },
          ],
        },
      ],
    },

    // Fallback
    { path: '*', element: <NotFoundPage /> },
  ],
  { future: { v7_startTransition: true } }
)

/** Use this outside React components (e.g. AuthContext) */
export function navigateTo(path: string) {
  router.navigate(path, { replace: true })
}
