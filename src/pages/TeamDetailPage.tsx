import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Users, Target, Trophy, Crown, Shield, Zap, TrendingUp, Activity, ChevronRight } from 'lucide-react'
import { useTeam } from '@/hooks/useTeams'
import { useStandings } from '@/hooks/useStandings'
import { useMatches } from '@/hooks/useMatches'
import { useActiveSeason } from '@/hooks/useSeasons'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { POSITION_LABELS, FormBadge } from '@/components/ui/SharedBadges'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import type { Player, PlayerPosition, TeamRef, TeamWithCaptain } from '@/types/database'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

const POSITION_ORDER: PlayerPosition[] = ['goalkeeper', 'defender', 'midfielder', 'forward']
const POSITION_FULL_LABELS: Record<string, string> = {
  'goalkeeper': 'Gardiens',
  'defender': 'Défenseurs',
  'midfielder': 'Milieux',
  'forward': 'Attaquants'
}

export function TeamDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: season } = useActiveSeason()
  const { data: team, isLoading } = useTeam(id)
  const { data: standings } = useStandings(season?.id)
  const { data: matches } = useMatches(season?.id)

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
  }

  if (!team) {
    return (
      <div className="card text-center py-16">
        <p className="text-slate-400">Équipe introuvable.</p>
        <Link to="/teams" className="btn-secondary mt-4 inline-flex">← Retour aux équipes</Link>
      </div>
    )
  }

  const players = (team.players ?? []) as Player[]
  const standing = standings?.find(s => s.team_id === id)
  const form = standing?.form ?? []
  const teamWithCaptain = team as unknown as TeamWithCaptain

  // Team matches (completed)
  const teamMatches = (matches ?? [])
    .filter(m => (m.home_team_id === id || m.away_team_id === id) && m.status === 'completed')
    .sort((a, b) => new Date(b.played_at ?? 0).getTime() - new Date(a.played_at ?? 0).getTime())
    .slice(0, 5)

  const groupedPlayers = POSITION_ORDER.reduce((acc, pos) => {
    const posPlayers = players.filter(p => p.position === pos && p.is_active)
    if (posPlayers.length > 0) {
      acc[pos] = posPlayers.sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99))
    }
    return acc
  }, {} as Record<string, Player[]>)

  // Handle players with no position or other positions
  const otherPlayers = players.filter(p => (!p.position || !POSITION_ORDER.includes(p.position)) && p.is_active)
  if (otherPlayers.length > 0) {
    groupedPlayers['OTHER'] = otherPlayers.sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99))
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-6 pb-20 px-1"
    >
      {/* Navigation */}
      <Breadcrumbs items={[
        { label: 'Équipes', to: '/teams' },
        { label: team.name }
      ]} />

      {/* ── Team hero ── */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-surface-card shadow-2xl"
      >
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-mesh opacity-20" />
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div
          className="absolute -right-20 -top-20 w-64 h-64 blur-[100px] opacity-20 rounded-full"
          style={{ backgroundColor: team.color }}
        />
        <div
          className="absolute -left-20 -bottom-20 w-64 h-64 blur-[100px] opacity-20 rounded-full"
          style={{ backgroundColor: team.color }}
        />

        <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Logo with animation */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative group"
          >
            <div
              className="w-32 h-32 md:w-40 md:h-40 rounded-3xl flex items-center justify-center text-white text-5xl md:text-6xl font-black shadow-2xl relative z-10 overflow-hidden ring-4 ring-white/5"
              style={{ backgroundColor: team.color }}
            >
              {team.logo_url ? (
                <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <span className="text-glow">{team.name[0].toUpperCase()}</span>
              )}
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-linear-to-tr from-black/20 to-transparent pointer-events-none" />
            </div>
            {/* Soft shadow/glow behind logo */}
            <div
              className="absolute inset-0 blur-3xl opacity-40 -z-10 scale-90"
              style={{ backgroundColor: team.color }}
            />
          </motion.div>

          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Équipe Officielle
                </span>
                {standing && standings && (
                  <span className="px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/20 text-[10px] font-bold uppercase tracking-widest text-primary-400">
                    Rang #{standings.findIndex(s => s.team_id === id) + 1}
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight text-glow-sm">
                {team.name}
              </h1>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-slate-400">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-primary-500" />
                <span className="font-semibold text-white">{players.length}</span>
                <span className="text-sm">joueurs</span>
              </div>
              {form.length > 0 && (
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-green-500" />
                  <div className="flex items-center gap-1.5">
                    {form.slice(-5).map((r, i) => <FormBadge key={i} result={r} />)}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Buts</div>
                <div className="text-2xl font-black text-white">{standing?.goals_for || 0}</div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Différence</div>
                <div className="text-2xl font-black text-white">{standing?.goal_diff || 0}</div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Matchs</div>
                <div className="text-2xl font-black text-white">{standing?.played || 0}</div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Win Rate</div>
                <div className="text-2xl font-black text-white">
                  {standing?.played ? Math.round((standing.won / standing.played) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Main Stats Grid ── */}
      {standing && (
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Points', value: standing.points, icon: Trophy, color: 'text-gold-500', bg: 'bg-gold-500/10', border: 'border-gold-500/20' },
            { label: 'Victoires', value: standing.won, icon: Zap, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
            { label: 'Nuls', value: standing.drawn, icon: Activity, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
            { label: 'Défaites', value: standing.lost, icon: Shield, color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
          ].map((stat) => (
            <div
              key={stat.label}
              className={clsx(
                'glass-morphism rounded-2xl p-5 relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1',
                stat.bg, stat.border
              )}
            >
              <stat.icon className={clsx('absolute -right-4 -bottom-4 w-20 h-20 opacity-5 group-hover:scale-110 transition-transform duration-500', stat.color)} />
              <div className="relative z-10">
                <p className={clsx('text-3xl font-black mb-1', stat.color)}>{stat.value}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Squad Section (2/3 width) ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black text-white flex items-center gap-3">
              <Users size={20} className="text-primary-500" />
              Effectif
            </h2>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">
              {players.length} Joueurs
            </span>
          </div>

          <div className="glass-morphism rounded-3xl overflow-hidden border border-white/5">
            {players.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-slate-600">
                  <Users size={32} />
                </div>
                <p className="text-slate-500 font-medium italic">Aucun joueur enregistré.</p>
              </div>
            ) : (
              <div className="p-2 space-y-8 my-4">
                {Object.entries(groupedPlayers).map(([pos, posPlayers]) => (
                  <div key={pos} className="space-y-4">
                    <div className="flex items-center gap-4 px-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500/80">
                        {POSITION_FULL_LABELS[pos] || 'Autres'}
                      </h3>
                      <div className="h-px flex-1 bg-linear-to-r from-primary-500/20 to-transparent" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {posPlayers.map((p) => {
                        const isCaptain = teamWithCaptain.captain_player_id === p.id
                        return (
                          <motion.div
                            key={p.id}
                            whileHover={{ scale: 1.01, x: 4 }}
                            className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all duration-200 cursor-pointer border border-transparent hover:border-white/10"
                          >
                            <div className="w-8 font-mono text-xs font-black text-slate-600 group-hover:text-primary-400 transition-colors">
                              #{p.jersey_number ?? '—'}
                            </div>

                            <div className="relative">
                              <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-black shadow-lg overflow-hidden relative ring-2 ring-white/5"
                                style={{ backgroundColor: team.color }}
                              >
                                {p.avatar_url ? (
                                  <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span>{p.first_name[0]}{p.last_name[0]}</span>
                                )}
                                {/* Status indicator */}
                                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500 border-2 border-surface-card" />
                              </div>
                              {isCaptain && (
                                <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-linear-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center shadow-lg ring-2 ring-surface-card">
                                  <Crown size={12} className="text-white" strokeWidth={3} />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-white font-bold truncate group-hover:text-primary-400 transition-colors">
                                  {p.first_name} {p.last_name}
                                </p>
                                {isCaptain && (
                                  <span className="text-[9px] font-black uppercase tracking-widest text-gold-500 bg-gold-500/10 px-2 py-0.5 rounded-full border border-gold-500/20">
                                    Captain
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                {POSITION_LABELS[p.position!] || 'Non défini'}
                              </p>
                            </div>

                            <ChevronRight size={16} className="text-slate-700 group-hover:text-white transition-colors" />
                          </motion.div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar (1/3 width) ── */}
        <div className="space-y-6">
          {/* Recent results */}
          {teamMatches.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white flex items-center gap-3 px-2">
                <TrendingUp size={20} className="text-primary-500" />
                Résultats
              </h2>

              <div className="glass-morphism rounded-3xl p-2 space-y-1.5">
                {teamMatches.map(m => {
                  const isHome = m.home_team_id === id
                  const myScore = isHome ? m.home_score! : m.away_score!
                  const oppScore = isHome ? m.away_score! : m.home_score!
                  const opponent = (isHome ? m.away_team : m.home_team) as TeamRef
                  const result: 'W' | 'D' | 'L' = myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D'

                  return (
                    <Link
                      key={m.id}
                      to={`/matches/${m.id}`}
                      className="group flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all duration-200 border border-transparent hover:border-white/10"
                    >
                      <FormBadge result={result} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="w-2 h-2 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: opponent.color }} />
                          <span className="text-slate-300 text-xs font-bold truncate group-hover:text-white">{opponent.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-white font-black text-lg tabular-nums">
                            {isHome ? `${myScore} – ${oppScore}` : `${oppScore} – ${myScore}`}
                          </span>
                          <span className={clsx(
                            "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
                            isHome ? "text-blue-400 bg-blue-400/10" : "text-purple-400 bg-purple-400/10"
                          )}>
                            {isHome ? 'Dom.' : 'Ext.'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-700 group-hover:text-white" />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {/* Offensive stats */}
          {standing && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-white flex items-center gap-3 px-2">
                <Target size={20} className="text-primary-500" />
                Statistiques
              </h2>

              <div className="glass-morphism rounded-3xl p-6 space-y-8 relative overflow-hidden">
                {/* Background decoration */}
                <Target className="absolute -right-8 -bottom-8 w-32 h-32 text-primary-500/5 rotate-12" />

                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-3xl font-black text-white">{standing.goals_for}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Buts marqués</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500">
                      <Zap size={24} />
                    </div>
                  </div>

                  <div className="h-px bg-white/5" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-3xl font-black text-white">{standing.goals_against}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Buts encaissés</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                      <Shield size={24} />
                    </div>
                  </div>

                  <div className="h-px bg-white/5" />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className={clsx(
                        'text-3xl font-black',
                        standing.goal_diff > 0 ? 'text-green-400' : standing.goal_diff < 0 ? 'text-red-400' : 'text-white'
                      )}>
                        {standing.goal_diff > 0 ? `+${standing.goal_diff}` : standing.goal_diff}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Différence</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-slate-400">
                      <Activity size={24} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
