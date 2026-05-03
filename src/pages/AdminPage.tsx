import { useState } from 'react'
import { Settings, Users, Calendar, Trophy, Eye, SlidersHorizontal, Target } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { AdminSeasonsPage } from './admin/AdminSeasonsPage'
import { AdminTeamsPage } from './admin/AdminTeamsPage'
import { AdminSchedulePage } from './admin/AdminSchedulePage'
import { AdminGoalsPage } from './admin/AdminGoalsPage'
import { AdminSpectatorsPage } from './admin/AdminSpectatorsPage'
import { AdminSettingsPage } from './admin/AdminSettingsPage'
import { clsx } from 'clsx'

const TABS = [
  { id: 'seasons',    label: 'Saisons',     icon: Trophy },
  { id: 'teams',      label: 'Équipes',     icon: Users },
  { id: 'schedule',   label: 'Calendrier',  icon: Calendar },
  { id: 'goals',      label: 'Buts',        icon: Target },
  { id: 'spectators', label: 'Spectateurs', icon: Eye },
  { id: 'settings',   label: 'Paramètres',  icon: SlidersHorizontal },
] as const

type TabId = typeof TABS[number]['id']

export function AdminPage() {
  const { isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('seasons')

  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="text-primary-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Administration</h1>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-surface-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap shrink-0',
              activeTab === id
                ? 'bg-primary-600/20 text-primary-400 border-b-2 border-primary-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-border/30'
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'seasons'    && <AdminSeasonsPage />}
        {activeTab === 'teams'      && <AdminTeamsPage />}
        {activeTab === 'schedule'   && <AdminSchedulePage />}
        {activeTab === 'goals'      && <AdminGoalsPage />}
        {activeTab === 'spectators' && <AdminSpectatorsPage />}
        {activeTab === 'settings'   && <AdminSettingsPage />}
      </div>
    </div>
  )
}
