import { Users, ChevronRight, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTeams } from '@/hooks/useTeams'
import { useRealtimeTeams } from '@/hooks/useRealtime'
import { useMyTeam } from '@/hooks/useMyTeam'
import { PageHero } from '@/components/ui/PageHero'
import { SkeletonRect, SkeletonLine } from '@/components/ui/SkeletonLoader'
import { clsx } from 'clsx'
import { motion } from 'framer-motion'

/** Skeleton d'une carte équipe — même grille que la vraie card */
function SkeletonTeamCard() {
  return (
    <div className="glass-morphism rounded-3xl p-5 space-y-4">
      <div className="flex items-center gap-4">
        <SkeletonRect className="w-14 h-14 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="w-2/3" height="h-4" />
          <SkeletonLine width="w-1/3" height="h-3" />
        </div>
        <SkeletonRect className="w-5 h-5 rounded" />
      </div>
      <SkeletonRect className="w-full h-1 rounded-full" />
    </div>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 }
}

export function TeamsPage() {
  const { data: season, isLoading: seasonLoading } = useActiveSeason()
  const { data: teams, isLoading: teamsLoading } = useTeams(season?.id)
  const { myTeamId } = useMyTeam(season?.id)

  useRealtimeTeams(season?.id)

  const isLoading = seasonLoading || teamsLoading

  return (
    <div className="space-y-6 pb-10">

      {/* Hero */}
      <PageHero
        imageUrl="https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=1200&q=80&auto=format&fit=crop"
        pattern="dots"
        accentColor="#8b5cf6"
        title="Équipes"
        subtitle={season?.name}
        icon={<Users size={20} className="text-violet-400" />}
        stats={teams?.length ? [
          { label: 'Équipes',  value: teams.length },
          { label: 'Joueurs',  value: teams.reduce((acc, t) => {
            const count = (t as unknown as { players?: { count: number }[] }).players?.[0]?.count ?? 0
            return acc + count
          }, 0) },
        ] : undefined}
        compact
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonTeamCard key={i} />)}
        </div>
      ) : !season ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={20} /></div>
            <p className="text-slate-400">Aucune saison active</p>
          </div>
        </div>
      ) : !teams?.length ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={20} /></div>
            <p className="text-slate-300 font-medium">Aucune équipe enregistrée</p>
          </div>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {teams.map((team) => {
            const playerCount = (team as unknown as { players?: { count: number }[] }).players?.[0]?.count ?? 0
            const isMyTeam = team.id === myTeamId
            return (
              <motion.div key={team.id} variants={itemVariants}>
                <Link
                  to={`/teams/${team.slug || team.id}`}
                  className={clsx(
                    'group relative flex flex-col gap-4 p-5 rounded-3xl transition-all duration-300 glass-morphism overflow-hidden',
                    isMyTeam ? 'ring-2 ring-primary-500/50 bg-primary-500/5' : 'hover:bg-surface-raised/50 dark:hover:bg-white/5 hover:-translate-y-1'
                  )}
                >
                  {/* Decorative background logo */}
                  <div className="absolute -right-8 -top-8 w-32 h-32 opacity-5 rotate-12 group-hover:rotate-45 transition-transform duration-700">
                     {team.logo_url ? (
                        <img src={team.logo_url} alt="" className="w-full h-full object-contain grayscale" />
                     ) : ( /* Changed to text-text-muted for better light mode visibility */
                        <Users size={128} className="text-text-muted" />
                     )}
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Logo */}
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300"
                      style={{ backgroundColor: team.color }}
                    >
                      {team.logo_url
                        ? <img src={team.logo_url} alt={team.name} className="w-10 h-10 object-contain" />
                        : team.name[0].toUpperCase()
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-slate-800 dark:text-white truncate group-hover:text-primary-400 transition-colors">
                          {team.name}
                    </h3>
                        {isMyTeam && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-primary-400 bg-primary-400/10 px-2 py-0.5 rounded-full border border-primary-400/20">
                            Mine
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Users size={12} className="text-text-muted" />
                          <span className="text-xs font-bold">{playerCount}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Trophy size={12} className="text-text-muted" />
                          <span className="text-xs font-bold italic">Squad H5</span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight size={18} className="text-slate-400 dark:text-slate-600 group-hover:text-slate-800 dark:group-hover:text-white group-hover:translate-x-1 transition-all" />
                  </div>

                  {/* Progress/Capacity bar placeholder or accent line - Changed bg-slate-100 to bg-surface-raised */}
                  <div className="mt-2 h-1 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((playerCount / 10) * 100, 100)}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
