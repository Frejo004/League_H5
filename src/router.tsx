import { lazy, Suspense } from 'react'
import { createBrowserRouter, Outlet } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// Helper pour les imports nommés
const lazyPage = (importFn: () => Promise<any>, name: string) => 
  lazy(() => importFn().then(module => ({ default: module[name] })))

// Auth
const LoginPage           = lazyPage(() => import('@/pages/auth/LoginPage'), 'LoginPage')
const SignupPage          = lazyPage(() => import('@/pages/auth/SignupPage'), 'SignupPage')
const ResetPasswordPage   = lazyPage(() => import('@/pages/auth/ResetPasswordPage'), 'ResetPasswordPage')
const UpdatePasswordPage  = lazyPage(() => import('@/pages/auth/UpdatePasswordPage'), 'UpdatePasswordPage')
const JoinPage            = lazyPage(() => import('@/pages/auth/JoinPage'), 'JoinPage')

// Core
const DashboardPage       = lazyPage(() => import('@/pages/DashboardPage'), 'DashboardPage')
const StandingsPage       = lazyPage(() => import('@/pages/StandingsPage'), 'StandingsPage')
const MatchesPage         = lazyPage(() => import('@/pages/MatchesPage'), 'MatchesPage')
const MatchDetailPage     = lazyPage(() => import('@/pages/MatchDetailPage'), 'MatchDetailPage')
const ScorersPage         = lazyPage(() => import('@/pages/ScorersPage'), 'ScorersPage')
const TeamsPage           = lazyPage(() => import('@/pages/TeamsPage'), 'TeamsPage')
const TeamDetailPage       = lazyPage(() => import('@/pages/TeamDetailPage'), 'TeamDetailPage')
const PlayersPage         = lazyPage(() => import('@/pages/PlayersPage'), 'PlayersPage')
const PlayerProfilePage   = lazyPage(() => import('@/pages/PlayerProfilePage'), 'PlayerProfilePage')
const StatsPage           = lazyPage(() => import('@/pages/StatsPage'), 'StatsPage')
const AdminPage           = lazyPage(() => import('@/pages/AdminPage'), 'AdminPage')
const ProfilePage         = lazyPage(() => import('@/pages/ProfilePage'), 'ProfilePage')
const CaptainPage         = lazyPage(() => import('@/pages/CaptainPage'), 'CaptainPage')
const MyStatsPage         = lazyPage(() => import('@/pages/MyStatsPage'), 'MyStatsPage')
const MyTeamPage          = lazyPage(() => import('@/pages/MyTeamPage'), 'MyTeamPage')
const PalmaresPage        = lazyPage(() => import('@/pages/PalmaresPage'), 'PalmaresPage')
const RulesPage           = lazyPage(() => import('@/pages/RulesPage'), 'RulesPage')
const LandingPage         = lazyPage(() => import('@/pages/LandingPage'), 'LandingPage')
const ChatPage            = lazyPage(() => import('@/pages/ChatPage'), 'ChatPage')
const PlayoffsPage        = lazyPage(() => import('@/pages/PlayoffsPage'), 'PlayoffsPage')
const NotFoundPage        = lazyPage(() => import('@/pages/NotFoundPage'), 'NotFoundPage')

function SuspenseWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0D1117]">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <Outlet />
    </Suspense>
  )
}

export const router = createBrowserRouter(
  [
    {
      element: <SuspenseWrapper />,
      children: [
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
                { path: '/matches/:idOrSlug',   element: <MatchDetailPage /> },
                { path: '/scorers',       element: <ScorersPage /> },
                { path: '/teams',         element: <TeamsPage /> },
                { path: '/teams/:idOrSlug',     element: <TeamDetailPage /> },
                { path: '/players',       element: <PlayersPage /> },
                { path: '/players/:idOrSlug',   element: <PlayerProfilePage /> },
                { path: '/stats',         element: <StatsPage /> },
                { path: '/admin',         element: <AdminPage /> },
                { path: '/captain',       element: <CaptainPage /> },
                { path: '/my-stats',      element: <MyStatsPage /> },
                { path: '/my-team',       element: <MyTeamPage /> },
                { path: '/palmares',      element: <PalmaresPage /> },
                { path: '/rules',         element: <RulesPage /> },
                { path: '/profile',       element: <ProfilePage /> },
                { path: '/chat',          element: <ChatPage /> },
                { path: '/playoffs',      element: <PlayoffsPage /> },
              ],
            },
          ],
        },

        // Fallback
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ]
)

/** Use this outside React components (e.g. AuthContext) */
export function navigateTo(path: string) {
  router.navigate(path, { replace: true })
}
