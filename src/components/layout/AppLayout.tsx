import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { TopBar } from './TopBar'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

export function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex min-h-screen bg-surface">

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main
          key={location.pathname}
          className="flex-1 p-3 lg:p-5 pb-20 lg:pb-5 overflow-auto animate-fade-in-up"
        >
          {/* ErrorBoundary par page — reset automatique à chaque navigation */}
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
