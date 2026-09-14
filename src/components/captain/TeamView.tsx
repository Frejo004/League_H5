import { useState } from 'react'
import { Users, Calendar, Layout, Target, Send } from 'lucide-react'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'
import { TabJoueurs } from '@/components/captain/TabJoueurs'
import { TabMatchs } from '@/components/captain/TabMatchs'
import { TabTactique } from '@/components/captain/TabTactique'
import { TabTransferts } from '@/components/captain/TabTransferts'
import { TabStats } from '@/components/captain/TabStats'

type Tab = 'joueurs' | 'matchs' | 'stats' | 'tactique' | 'transferts'

const TABS: { id: Tab; label: string; icon: React.FC<{ size?: number; className?: string }> }[] = [
  { id: 'joueurs', label: 'Joueurs', icon: Users },
  { id: 'matchs', label: 'Matchs', icon: Calendar },
  { id: 'tactique', label: 'Tactique', icon: Layout },
  { id: 'stats', label: 'Stats', icon: Target },
  { id: 'transferts', label: 'Transferts', icon: Send },
]

export function TeamView({
  teamId,
  teamColor,
  seasonId,
  readonly = false
}: {
  teamId: string
  teamColor: string
  seasonId: string
  readonly?: boolean
}) {
  const [activeTab, setActiveTab] = useState<Tab>('joueurs')

  const containerVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1 } }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6"
    >
      {/* Tab bar premium */}
      <div className="flex p-1 bg-black/40 backdrop-blur-md rounded-2xl border border-surface-border">
        {TABS.filter(t => !readonly || t.id !== 'tactique').map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={clsx(
              'relative flex-1 flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl transition-all duration-300',
              activeTab === id ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
            )}
          >
            {activeTab === id && (
              <motion.div
                layoutId="activeTabBackground"
                className="absolute inset-0 bg-surface-raised border border-surface-border rounded-xl"
              />
            )}
            <Icon size={16} className="relative z-10" />
            <span className="relative z-10 text-[10px] font-black uppercase tracking-widest">{label}</span>
          </button>
        ))}
      </div>

      {/* Contenu onglet */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'joueurs' && (
          <TabJoueurs teamId={teamId} teamColor={teamColor} seasonId={seasonId} readonly={readonly} />
        )}
        {activeTab === 'matchs' && (
          <TabMatchs teamId={teamId} seasonId={seasonId} />
        )}
        {activeTab === 'stats' && (
          <TabStats teamId={teamId} seasonId={seasonId} />
        )}
        {activeTab === 'tactique' && (
          <TabTactique teamId={teamId} seasonId={seasonId} teamColor={teamColor} readonly={readonly} />
        )}
        {activeTab === 'transferts' && (
          <TabTransferts teamId={teamId} />
        )}
      </motion.div>
    </motion.div>
  )
}
