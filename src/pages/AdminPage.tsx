import { useState, useEffect } from 'react'
import { Settings, Users, Calendar, Trophy, Eye, SlidersHorizontal, Target, Swords } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Navigate, useSearchParams, Link } from 'react-router-dom'
import { AdminSeasonsPage } from './admin/AdminSeasonsPage'
import { AdminTeamsPage } from './admin/AdminTeamsPage'
import { AdminSchedulePage } from './admin/AdminSchedulePage'
import { AdminGoalsPage } from './admin/AdminGoalsPage'
import { AdminSpectatorsPage } from './admin/AdminSpectatorsPage'
import { AdminSettingsPage } from './admin/AdminSettingsPage'
import { useSpectators } from '@/hooks/useSpectators'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as TabId | null
  const [activeTab, setActiveTab] = useState<TabId>(
    tabParam && TABS.some(t => t.id === tabParam) ? tabParam : 'seasons'
  )

  // Sync URL param → tab actif (ex: clic sur notif spectateur)
  useEffect(() => {
    if (tabParam && TABS.some(t => t.id === tabParam)) {
      setActiveTab(tabParam as TabId)
    }
  }, [tabParam])

  // Demandes en attente pour le badge
  const { data: spectators } = useSpectators()
  const pendingCount = (spectators ?? []).filter(s => s.status === 'pending').length

  function handleTabChange(id: TabId) {
    setActiveTab(id)
    setSearchParams(id !== 'seasons' ? { tab: id } : {}, { replace: true })
  }

  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="text-primary-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Administration</h1>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-surface-border">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isPending = id === 'spectators' && pendingCount > 0
          return (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap shrink-0',
                activeTab === id
                  ? 'bg-primary-600/20 text-primary-400 border-b-2 border-primary-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-border/30'
              )}
            >
              <Icon size={15} />
              {label}
              {isPending && (
                <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-yellow-500 text-black text-[10px] font-black flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'seasons'    && <AdminSeasonsPage />}
        {activeTab === 'teams'      && <AdminTeamsPage />}
        {activeTab === 'schedule'   && <AdminSchedulePage />}
        {activeTab === 'goals'      && <AdminGoalsPage />}
        {activeTab === 'spectators' && <AdminSpectatorsPage />}
        {activeTab === 'settings'   && (
          <div className="space-y-4">
            <AdminSettingsPage />
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-primary-500/20 bg-primary-500/5">
              <Swords size={16} className="text-primary-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white uppercase tracking-wider">Phase finale</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                  Gérer le bracket et les matchs de playoffs
                </p>
              </div>
              <Link
                to="/playoffs"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-primary-500 transition-colors shrink-0"
              >
                <Swords size={12} />
                Voir le bracket
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
