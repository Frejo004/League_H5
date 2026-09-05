import { Link, Navigate } from 'react-router-dom'
import {
  Trophy, Calendar, BarChart2,
  MessageCircle, Radio, Star, Zap,
  Shield, ChevronRight, Crown
} from 'lucide-react'
import bgImage from '@/assets/leagueH5-bg_bg.jpg'

import { useLandingStats } from '@/hooks/useLandingStats'
import { useCountUp } from '@/hooks/useCountUp'
import { useAuth } from '@/hooks/useAuth'
import { useSeo } from '@/hooks/useSeo'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { LiveClock } from '@/components/live/LiveClock' // Keep this import
import { useState, useEffect } from 'react'
import clsx from 'clsx'
import { NewsFeed } from '@/hooks/NewsFeed'
import { useTournaments } from '@/hooks/useTournaments'

const ACCENT = '#C8F135'

// ─────────────────────────────────────────────────────────────────────────────
// Composants internes
// ─────────────────────────────────────────────────────────────────────────────

function FeatureCard({ icon: Icon, title, desc, color }: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  title: string
  desc: string
  color: string
}) {
  return (
    <div className="group relative p-6 rounded-4xl bg-surface-card/50 border border-surface-border overflow-hidden transition-all duration-500 hover:bg-surface-raised/50 hover:-translate-y-2">
      {/* Effet de Halo au survol */}
      <div
        className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl"
        style={{ background: `radial-gradient(circle at center, ${color}20 0%, transparent 70%)` }}
      />

      <div className="relative z-10">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3"
          style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
        >
          <Icon size={22} style={{ color }} />
        </div>
        <h3 className="text-base font-black text-text-primary mb-2 uppercase tracking-tight font-['Barlow_Condensed']">
          {title}
        </h3>
        <p className="text-xs text-text-muted leading-relaxed group-hover:text-text-secondary transition-colors">
          {desc}
        </p>
      </div>
    </div>
  )
}

// ── Chess Tournament Card ───────────────────────────────────────────────────────
function ChessTournamentCard({ tournament }: { tournament: any }) {
  return (
    <div className="relative overflow-hidden p-6 rounded-4xl bg-gradient-to-br from-purple-500/10 to-purple-900/10 border border-purple-500/30 group hover:border-purple-500/50 transition-all duration-500 hover:-translate-y-2">
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-500" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center">
            <Crown size={24} className="text-purple-400" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Tournoi d'échecs</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] font-bold ${
              tournament.status === 'in_progress' ? 'bg-green-500/20 text-green-400' : 
              tournament.status === 'registration_open' ? 'bg-blue-500/20 text-blue-400' : 
              'bg-gray-500/20 text-gray-400'
            }`}>
              {tournament.status === 'in_progress' ? 'En cours' : 
               tournament.status === 'registration_open' ? 'Inscriptions ouvertes' : 
               tournament.status}
            </span>
          </div>
        </div>
        
        <h3 className="text-lg font-black text-text-primary mb-2 font-['Barlow_Condensed'] uppercase tracking-tight">
          {tournament.name}
        </h3>
        
        <div className="flex items-center gap-4 mb-4 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Trophy size={12} className="text-purple-400" />
            {tournament.tournament_type}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={12} className="text-purple-400" />
            {tournament.participants?.length || 0} participants
          </span>
        </div>
        
        <Link 
          to={`/tournaments/${tournament.slug}`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium transition-all duration-300 group-hover:scale-105"
        >
          Voir le tournoi <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  )
}

function StatPill({ value, label, isLoading }: { value: string | number; label: string; isLoading?: boolean }) {
  const numericValue = typeof value === 'number' ? value : parseInt(String(value)) || 0
  const animatedValue = useCountUp(numericValue)
  const displayValue = typeof value === 'string' && value.includes('+') ? `${animatedValue}+` : (isNaN(numericValue) ? value : animatedValue)

  return (
    <div className="relative overflow-hidden p-6 rounded-4xl bg-surface-card/50 border border-surface-border group hover:border-[#C8F135]/30 transition-all duration-500">
      <div className="relative z-10 flex flex-col items-center">
        {isLoading ? (
          <div className="h-10 w-16 bg-surface-raised/50 rounded-lg animate-pulse" />
        ) : (
          <span className="text-4xl font-black text-text-primary font-['Barlow_Condensed'] tracking-tighter group-hover:scale-110 transition-transform duration-500 italic">
            {displayValue}
          </span>
        )}
        <span className="text-[10px] font-bold text-[#C8F135] uppercase tracking-[0.2em] mt-2">
          {label}
        </span>
      </div>
    </div>
  )
}

function KickoffCountdown({ scheduledAt }: { scheduledAt: string }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const target = new Date(scheduledAt).getTime()

    function update() {
      const now = new Date().getTime()
      const diff = target - now

      if (diff <= 0) {
        setTimeLeft("Coup d'envoi imminent !")
        return
      }

      const d = Math.floor(diff / (1000 * 60 * 60 * 24))
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)

      const parts = []
      if (d > 0) parts.push(`${d}j`)
      if (h > 0 || d > 0) parts.push(`${h}h`)
      parts.push(`${m}m`)
      parts.push(`${s}s`)

      setTimeLeft(parts.join(' '))
    }

    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [scheduledAt])

  return (
    <span className="font-mono font-bold text-[#C8F135] text-[13px] md:text-sm tracking-wider animate-pulse whitespace-nowrap">
      {timeLeft}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Principale
// ─────────────────────────────────────────────────────────────────────────────

export function LandingPage() {
  useSeo({
    title: 'Accueil',
    description: 'League H5 — la ligue de football en ligne : matchs en direct, classement, stats, paris et communauté.',
  })
  const { profile } = useAuth()
  const { data: stats, isLoading } = useLandingStats()
  const { data: tournaments } = useTournaments()

  const { data: liveMatches } = useQuery({
    queryKey: ['live-matches-landing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!home_team_id(id, name, color, logo_url),
          away_team:teams!away_team_id(id, name, color, logo_url),
          seasons(id, name)
        `)
        .in('status', ['live', 'scheduled'])
        .order('scheduled_at', { ascending: true })
      if (error) throw error
      return data as any[] // eslint-disable-line @typescript-eslint/no-explicit-any
    },
    refetchInterval: 5000,
  })

  if (profile) {
    return <Navigate to="/dashboard" replace />
  }

  const matches = liveMatches ?? []
  
  // A. Trouver un match live actif
  let featuredMatch = matches.find(m => m.status === 'live')
  let isFeaturedLive = true

  // B. Si aucun match live, trouver le premier match scheduled à venir (sans limite de temps)
  if (!featuredMatch) {
    const upcoming = matches
      .filter(m => m.status === 'scheduled' && m.scheduled_at)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
    
    const now = new Date()
    featuredMatch = upcoming.find(m => new Date(m.scheduled_at) > now)
    isFeaturedLive = false
  }

  return (
    <div className="min-h-screen bg-[#0f1420] text-slate-50 selection:bg-[#C8F135] selection:text-[#0f1420] dark [--color-surface:#0f1420] [--color-surface-card:#161c2d] [--color-surface-raised:#1e2640] [--color-surface-border:#252f4a] [--color-surface-muted:#2d3a5a] [--color-text-primary:#f8fafc] [--color-text-secondary:#94a3b8] [--color-text-muted:#64748b]">

      {/* ── Navigation ── */}
      {/* <header className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-surface/60 border-b border-surface-border">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-[#C8F135] flex items-center justify-center transition-transform group-hover:rotate-12">
            <Trophy size={20} className="text-surface" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-black text-text-primary tracking-tighter font-['Barlow_Condensed']">
            LEAGUE <span style={{ color: ACCENT }}>H5</span>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Link to="/rules-public" className="hidden md:block text-xs font-bold uppercase tracking-widest text-text-muted hover:text-[#C8F135] transition-colors">
            Règlement
          </Link>
          <Link
            to="/auth/login"
            className="px-5 py-2.5 rounded-full bg-surface-raised border border-surface-border text-xs font-bold uppercase tracking-widest hover:bg-[#C8F135] hover:text-surface transition-all duration-300"
          >
            Connexion
          </Link>
        </div>
      </header> */}

      {/* ── Hero Section ── */}
      <section className="relative min-h-screen flex flex-col justify-center items-center pt-20 overflow-hidden">
        {/* Background avec overlay dynamique */}
        <div className="absolute inset-0 z-0">
          <img src={bgImage} className="w-full h-full object-cover opacity-30 scale-105 animate-slow-zoom" alt="" />
          <div className="absolute inset-0 bg-linear-to-b from-surface via-transparent to-surface" />
          <div className="absolute inset-0 bg-linear-to-r from-surface via-transparent to-surface" />
        </div>

        {/* 🔴 LIVE / UPCOMING FEATURED BANNER */}
        {featuredMatch && (
          <div className="relative z-10 w-full max-w-6xl mx-auto px-4 mb-10">
            <div className={clsx(
              "relative overflow-hidden rounded-[2.5rem] bg-[#161B22]/70 border backdrop-blur-xl p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-10 transition-all duration-500",
              isFeaturedLive 
                ? "border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)] hover:border-red-500/50" 
                : "border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.2)] hover:border-amber-500/50"
            )}>
              {/* Background spotlight overlay */}
              <div className={clsx(
                "absolute -inset-px opacity-50 pointer-events-none bg-linear-to-r via-transparent",
                isFeaturedLive ? "from-red-500/10 to-red-500/10" : "from-amber-500/10 to-amber-500/10"
              )} />
              
              {/* Live/Upcoming Indicator left */}
              <div className="flex flex-col items-center md:items-start gap-1 shrink-0">
                {isFeaturedLive ? (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-[10px] font-black uppercase tracking-[0.2em] text-red-500 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Live en cours
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Bientôt en Direct
                  </span>
                )}
                {featuredMatch.seasons?.name && (
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                    {featuredMatch.seasons.name}
                  </span>
                )}
              </div>

              {/* Scoreboard center */}
              <div className="flex-1 flex items-center justify-center gap-4 md:gap-10">
                {/* Home Team */}
                <div className="flex flex-col items-center text-center w-28 md:w-36">
                  <div 
                    className="w-16 h-16 md:w-24 md:h-24 rounded-4xl flex items-center justify-center p-1.5 bg-surface-card/50 border border-surface-border transition-transform hover:scale-110 shadow-lg backdrop-blur-sm"
                    style={{ borderBottom: `4px solid ${featuredMatch.home_team?.color || '#C8F135'}` }}
                  >
                    {featuredMatch.home_team?.logo_url ? (
                      <img src={featuredMatch.home_team.logo_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-2xl font-black font-['Barlow_Condensed'] text-text-primary">
                        {featuredMatch.home_team?.name?.slice(0,2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-black text-text-primary uppercase tracking-tighter mt-3 truncate max-w-full font-['Barlow_Condensed'] italic">
                    {featuredMatch.home_team?.name}
                  </span>
                </div>

                {/* Score & Time OR VS & Countdown */}
                <div className="flex flex-col items-center gap-1.5">
                  {isFeaturedLive ? (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl md:text-4xl font-black italic text-text-primary tracking-tighter font-['Barlow_Condensed']">
                          {featuredMatch.home_score ?? 0}
                        </span>
                        <span className="text-text-muted font-black text-lg">:</span>
                        <span className="text-3xl md:text-4xl font-black italic text-text-primary tracking-tighter font-['Barlow_Condensed']">
                          {featuredMatch.away_score ?? 0}
                        </span>
                      </div>
                      
                      <LiveClock
                        liveStartedAt={featuredMatch.live_started_at}
                        livePeriod={featuredMatch.live_period}
                        halftimeAt={featuredMatch.halftime_at}
                        isPaused={featuredMatch.is_paused}
                        pausedAt={featuredMatch.paused_at}
                        totalPausedSeconds={featuredMatch.total_paused_seconds}
                        status={featuredMatch.status}
                        homeColor={featuredMatch.home_team?.color || '#C8F135'}
                        awayColor={featuredMatch.away_team?.color || '#3b82f6'}
                        className="scale-90"
                      />
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-black uppercase tracking-[0.25em] text-text-muted font-['Barlow_Condensed']">
                          {new Date(featuredMatch.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(featuredMatch.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-2xl font-black italic text-text-secondary tracking-tighter font-['Barlow_Condensed'] uppercase">
                          VS
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] text-text-muted uppercase tracking-widest font-black">
                          Coup d'envoi dans
                        </span>
                        <KickoffCountdown scheduledAt={featuredMatch.scheduled_at} />
                      </div>
                    </>
                  )}
                </div>

                {/* Away Team */}
                <div className="flex flex-col items-center text-center w-28 md:w-36">
                  <div 
                    className="w-16 h-16 md:w-24 md:h-24 rounded-4xl flex items-center justify-center p-1.5 bg-surface-card/50 border border-surface-border transition-transform hover:scale-110 shadow-lg backdrop-blur-sm"
                    style={{ borderBottom: `4px solid ${featuredMatch.away_team?.color || '#3b82f6'}` }}
                  >
                    {featuredMatch.away_team?.logo_url ? (
                      <img src={featuredMatch.away_team.logo_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-2xl font-black font-['Barlow_Condensed'] text-text-primary">
                        {featuredMatch.away_team?.name?.slice(0,2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-xs md:text-sm font-black text-text-primary uppercase tracking-tighter mt-3 truncate max-w-full font-['Barlow_Condensed'] italic">
                    {featuredMatch.away_team?.name}
                  </span>
                </div>
              </div>

              {/* Action right */}
              <div className="shrink-0 w-full md:w-auto flex justify-center md:pl-4">
                <Link
                  to={`/public/matches/${featuredMatch.slug || featuredMatch.id}?tab=lineups`}
                  className={clsx(
                    "group relative flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white font-black uppercase italic tracking-tighter hover:scale-105 active:scale-95 transition-all w-full md:w-auto text-[11px] font-['Barlow_Condensed']",
                    isFeaturedLive 
                      ? "bg-red-600 hover:bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.4)]" 
                      : "bg-[#C8F135] text-[#0D1117]! hover:bg-[#d9ff4d] shadow-[0_0_30px_rgba(200,241,53,0.3)]"
                  )}
                >
                  {isFeaturedLive ? "Regarder le Live" : "Fiche du Match"}
                  <ChevronRight className="transition-transform group-hover:translate-x-1" size={16} />
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 text-center px-4 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/3 border border-white/10 mb-8 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-[#C8F135] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-muted/80">
              {isLoading ? 'SYNC...' : `${stats?.seasonName ?? 'Saison'} LIVE`}
            </span>
          </div>

          <h1 
            className="text-5xl md:text-7xl font-black leading-[0.9] tracking-tighter italic uppercase font-['Barlow_Condensed'] mb-6 text-text-primary"
          >
            HIGH FIVE <br />
            <span className="text-transparent" style={{ WebkitTextStroke: '1.5px #C8F135' }}>LIGUE</span>
          </h1>

          <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto mb-12 leading-relaxed">
            L'élite du football H5. Vivez l'expérience professionnelle avec <span className="text-text-primary font-bold">stats en direct</span>,
            messagerie intégrée et gestion de club simplifiée.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/public/matches"
              className="group w-full sm:w-auto flex items-center justify-center gap-3 px-10 py-5 rounded-2xl bg-[#C8F135] text-[#0D1117] font-black uppercase italic tracking-tighter hover:scale-105 transition-all shadow-[0_0_30px_rgba(200,241,53,0.3)]"
            >
              Voir les matchs
              <ChevronRight className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/auth/login"
              className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white/5 border border-white/10 font-black uppercase italic tracking-tighter hover:bg-white/10 transition-all backdrop-blur-md"
            >
              Rejoindre l'élite
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats Section ── */}
      <section className="relative z-20 px-6 mt-6 sm:-mt-20 mb-24">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatPill value={stats?.teams ?? 0} label="Clubs engagés" isLoading={isLoading} />
          <StatPill value={stats?.players ? `${stats.players}+` : '0+'} label="Athlètes" isLoading={isLoading} />
          <StatPill value="2×20'" label="Format Élite" />
          <StatPill value="LIVE" label="Streaming" />
        </div>
      </section>

      {/* ── Chess Tournaments Section ── */}
      {tournaments && tournaments.length > 0 && (
        <section className="relative z-20 px-6 mb-24">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <h2 className="text-4xl md:text-5xl font-black text-white font-['Barlow_Condensed'] italic uppercase tracking-tighter">
                  Tournois <span style={{ color: '#A855F7' }}>d'échecs</span>
                </h2>
                <p className="text-slate-500 mt-2 font-medium">Rejoignez les compétitions d'échecs HIGHFIVE.</p>
              </div>
              <Link 
                to="/tournaments"
                className="flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                Voir tous les tournois <ChevronRight size={16} />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.slice(0, 3).map(tournament => (
                <ChessTournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── News Feed Section ── */}
      <section className="relative z-20 px-6 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-white font-['Barlow_Condensed'] italic uppercase tracking-tighter">
                Dernières <span style={{ color: ACCENT }}>Actualités</span>
              </h2>
              <p className="text-slate-500 mt-2 font-medium">Restez informé de la vie de la ligue.</p>
            </div>
          </div>
          <NewsFeed />
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="px-6 py-24 relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-black text-white font-['Barlow_Condensed'] italic uppercase tracking-tighter">
                L'écosystème <span style={{ color: ACCENT }}>H5</span>
              </h2>
              <p className="text-slate-500 mt-2 font-medium">Une infrastructure digitale complète pour vos tournois.</p>
            </div>
            <div className="h-0.5 flex-1 bg-linear-to-r from-[#C8F135]/50 to-transparent mx-8 hidden md:block mb-4" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FeatureCard icon={Radio} title="Match Center" desc="Interface de live-scoring ultra-réactive pour chaque seconde du match." color="#ef4444" />
            <FeatureCard icon={Trophy} title="Hall of Fame" desc="Classements dynamiques et historique des champions par saison." color="#f59e0b" />
            <FeatureCard icon={BarChart2} title="Data Lab" desc="Analyses détaillées : heatmaps, efficacité devant le but et passes clés." color="#3b82f6" />
            <FeatureCard icon={MessageCircle} title="Locker Room" desc="Canaux de communication sécurisés pour votre équipe et le staff." color="#8b5cf6" />
            <FeatureCard icon={Calendar} title="Smart Schedule" desc="Gestion automatisée des reports et synchronisation calendrier." color="#22c55e" />
            <FeatureCard icon={Shield} title="Fair-Play Index" desc="Suivi disciplinaire rigoureux pour maintenir l'esprit sportif." color="#06b6d4" />
            <FeatureCard icon={Star} title="MVP Voting" desc="Le public et les capitaines élisent les meilleurs après chaque match." color="#fbbf24" />
            <FeatureCard icon={Zap} title="Instant Replay" desc="Accès rapide aux moments forts et aux vidéos de la communauté." color="#C8F135" />
          </div>
        </div>
      </section>

      {/* ── Values Ticker ── */}
      <section className="py-20 bg-linear-to-b from-[#0D1117] to-[#161B22] border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-8">
            {['Respect', 'Fair-play', 'Discipline', 'Passion'].map((v) => (
              <div key={v} className="flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-[#C8F135]" />
                <span className="text-3xl md:text-5xl font-black text-white/20 uppercase italic font-['Barlow_Condensed'] hover:text-white/60 transition-colors cursor-default">
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 border-t border-white/5 text-center bg-[#0D1117]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="w-12 h-12 rounded-xl bg-white/3 flex items-center justify-center mx-auto mb-6">
            <Trophy size={24} className="text-slate-600" />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-slate-500">
            © 2026 League H5 · Unis pour le football
          </p>
        </div>
      </footer>
    </div>
  )
}