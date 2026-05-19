import { Link, Navigate } from 'react-router-dom'
import {
  Trophy, Calendar, Target, Users, BarChart2,
  MessageCircle, Radio, Star, ArrowRight, Zap,
  Shield, BookOpen, ChevronRight
} from 'lucide-react'
import bgImage from '@/assets/leagueH5-bg_bg.jpg'

import { useLandingStats } from '@/hooks/useLandingStats'
import { useCountUp } from '@/hooks/useCountUp'
import { useAuth } from '@/hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { LiveClock } from '@/components/live/LiveClock'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

const ACCENT = '#C8F135'

// ─────────────────────────────────────────────────────────────────────────────
// Composants internes
// ─────────────────────────────────────────────────────────────────────────────

function FeatureCard({ icon: Icon, title, desc, color }: {
  icon: any
  title: string
  desc: string
  color: string
}) {
  return (
    <div className="group relative p-6 rounded-[2rem] bg-white/[0.02] border border-white/[0.05] overflow-hidden transition-all duration-500 hover:bg-white/[0.04] hover:-translate-y-2">
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
        <h3 className="text-base font-black text-white mb-2 uppercase tracking-tight font-['Barlow_Condensed']">
          {title}
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed group-hover:text-slate-300 transition-colors">
          {desc}
        </p>
      </div>
    </div>
  )
}

function StatPill({ value, label, isLoading }: { value: string | number; label: string; isLoading?: boolean }) {
  const numericValue = typeof value === 'number' ? value : parseInt(String(value)) || 0
  const animatedValue = useCountUp(numericValue)
  const displayValue = typeof value === 'string' && value.includes('+') ? `${animatedValue}+` : (isNaN(numericValue) ? value : animatedValue)

  return (
    <div className="relative overflow-hidden p-6 rounded-[2rem] bg-[#161B22]/50 border border-white/[0.05] group hover:border-[#C8F135]/30 transition-all duration-500">
      <div className="relative z-10 flex flex-col items-center">
        {isLoading ? (
          <div className="h-10 w-16 bg-white/5 rounded-lg animate-pulse" />
        ) : (
          <span className="text-4xl font-black text-white font-['Barlow_Condensed'] tracking-tighter group-hover:scale-110 transition-transform duration-500 italic">
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

      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)

      const parts = []
      if (h > 0) parts.push(`${h}h`)
      parts.push(`${m}m`)
      parts.push(`${s}s`)

      setTimeLeft(parts.join(' '))
    }

    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [scheduledAt])

  return (
    <span className="font-mono font-bold text-[#C8F135] text-[13px] md:text-sm tracking-wider animate-pulse">
      {timeLeft}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page Principale
// ─────────────────────────────────────────────────────────────────────────────

export function LandingPage() {
  const { profile } = useAuth()
  const { data: stats, isLoading } = useLandingStats()

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
      return data as any[]
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

  // B. Si aucun match live, trouver le premier match scheduled qui débute dans moins d'une heure
  if (!featuredMatch) {
    const upcoming = matches.filter(m => m.status === 'scheduled' && m.scheduled_at)
    const now = new Date()
    
    featuredMatch = upcoming.find(m => {
      const scheduledTime = new Date(m.scheduled_at)
      const diffMins = (scheduledTime.getTime() - now.getTime()) / (1000 * 60)
      return diffMins > 0 && diffMins <= 60
    })
    isFeaturedLive = false
  }

  return (
    <div className="min-h-screen bg-[#0D1117] text-slate-200 selection:bg-[#C8F135] selection:text-[#0D1117]">

      {/* ── Navigation ── */}
      {/* <header className="fixed top-0 w-full z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-[#0D1117]/60 border-b border-white/[0.05]">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-9 h-9 rounded-xl bg-[#C8F135] flex items-center justify-center transition-transform group-hover:rotate-12">
            <Trophy size={20} className="text-[#0D1117]" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-black text-white tracking-tighter font-['Barlow_Condensed']">
            LEAGUE <span style={{ color: ACCENT }}>H5</span>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Link to="/rules-public" className="hidden md:block text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-[#C8F135] transition-colors">
            Règlement
          </Link>
          <Link
            to="/auth/login"
            className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-[#C8F135] hover:text-[#0D1117] transition-all duration-300"
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
          <div className="absolute inset-0 bg-gradient-to-b from-[#0D1117] via-transparent to-[#0D1117]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0D1117] via-transparent to-[#0D1117]" />
        </div>

        {/* 🔴 LIVE / UPCOMING FEATURED BANNER */}
        {featuredMatch && (
          <div className="relative z-10 w-full max-w-4xl mx-auto px-4 mb-10">
            <div className={clsx(
              "relative overflow-hidden rounded-[2.5rem] bg-[#161B22]/70 border backdrop-blur-xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-500",
              isFeaturedLive 
                ? "border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.2)] hover:border-red-500/50" 
                : "border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.2)] hover:border-amber-500/50"
            )}>
              {/* Background spotlight overlay */}
              <div className={clsx(
                "absolute -inset-px opacity-50 pointer-events-none bg-gradient-to-r via-transparent",
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
                <div className="flex flex-col items-center text-center w-24 md:w-32">
                  <div 
                    className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center p-2.5 bg-slate-900/50 border border-white/5 transition-transform hover:scale-105"
                    style={{ borderLeft: `3px solid ${featuredMatch.home_team?.color || '#C8F135'}` }}
                  >
                    {featuredMatch.home_team?.logo_url ? (
                      <img src={featuredMatch.home_team.logo_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-lg font-bold font-['Barlow_Condensed'] text-white">
                        {featuredMatch.home_team?.name?.slice(0,2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] md:text-xs font-bold text-white uppercase tracking-tight mt-2 truncate max-w-full">
                    {featuredMatch.home_team?.name}
                  </span>
                </div>

                {/* Score & Time OR VS & Countdown */}
                <div className="flex flex-col items-center gap-1.5">
                  {isFeaturedLive ? (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl md:text-4xl font-black italic text-white tracking-tighter font-['Barlow_Condensed']">
                          {featuredMatch.home_score ?? 0}
                        </span>
                        <span className="text-slate-600 font-black text-lg">:</span>
                        <span className="text-3xl md:text-4xl font-black italic text-white tracking-tighter font-['Barlow_Condensed']">
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
                        <span className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 font-['Barlow_Condensed']">
                          {new Date(featuredMatch.scheduled_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-2xl font-black italic text-slate-300 tracking-tighter font-['Barlow_Condensed'] uppercase">
                          VS
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
                          Coup d'envoi dans
                        </span>
                        <KickoffCountdown scheduledAt={featuredMatch.scheduled_at} />
                      </div>
                    </>
                  )}
                </div>

                {/* Away Team */}
                <div className="flex flex-col items-center text-center w-24 md:w-32">
                  <div 
                    className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center p-2.5 bg-slate-900/50 border border-white/5 transition-transform hover:scale-105"
                    style={{ borderLeft: `3px solid ${featuredMatch.away_team?.color || '#3b82f6'}` }}
                  >
                    {featuredMatch.away_team?.logo_url ? (
                      <img src={featuredMatch.away_team.logo_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-lg font-bold font-['Barlow_Condensed'] text-white">
                        {featuredMatch.away_team?.name?.slice(0,2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] md:text-xs font-bold text-white uppercase tracking-tight mt-2 truncate max-w-full">
                    {featuredMatch.away_team?.name}
                  </span>
                </div>
              </div>

              {/* Action right */}
              <div className="shrink-0 w-full md:w-auto flex justify-center">
                <Link
                  to={`/public/matches/${featuredMatch.slug || featuredMatch.id}`}
                  className={clsx(
                    "group relative flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-white font-black uppercase italic tracking-tighter hover:scale-105 active:scale-95 transition-all w-full md:w-auto text-xs",
                    isFeaturedLive 
                      ? "bg-red-600 hover:bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]" 
                      : "bg-amber-600 hover:bg-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]"
                  )}
                >
                  {isFeaturedLive ? "Regarder le Live" : "Fiche du Match"}
                  <ChevronRight className="transition-transform group-hover:translate-x-0.5" size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 text-center px-4 max-w-5xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 mb-8 backdrop-blur-md">
            <span className="flex h-2 w-2 rounded-full bg-[#C8F135] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">
              {isLoading ? 'SYNC...' : `${stats?.seasonName ?? 'Saison'} LIVE`}
            </span>
          </div>

          <h1 className="text-7xl md:text-[120px] font-black text-white leading-[0.85] tracking-tighter italic uppercase font-['Barlow_Condensed'] mb-8">
            HIGH FIVE <br />
            <span className="text-transparent" style={{ WebkitTextStroke: '2px #C8F135' }}>LIGUE</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            L'élite du football H5. Vivez l'expérience professionnelle avec <span className="text-white font-bold">stats en direct</span>,
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
            <div className="h-[2px] flex-1 bg-gradient-to-r from-[#C8F135]/50 to-transparent mx-8 hidden md:block mb-4" />
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
      <section className="py-20 bg-gradient-to-b from-[#0D1117] to-[#161B22] border-y border-white/[0.05]">
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
      <footer className="py-12 border-t border-white/[0.05] text-center bg-[#0D1117]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
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