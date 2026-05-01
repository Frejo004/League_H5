import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { TopBar } from './TopBar'
import bgImage from '@/assets/leagueH5-bg_login.jpg'

export function AppLayout() {
  const location = useLocation()

  return (
    <div className="flex min-h-screen bg-surface">

      {/* Background image */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
        }}
      >
        {/* Dark overlay to keep content readable */}
        <div className="absolute inset-0 bg-black/75" />
        {/* Subtle green tint at top */}
        <div className="absolute inset-0 bg-linear-to-br from-primary-950/60 via-transparent to-transparent" />
      </div>

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <TopBar />

        <main
          key={location.pathname}
          className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6 overflow-auto animate-fade-in-up"
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  )
}
