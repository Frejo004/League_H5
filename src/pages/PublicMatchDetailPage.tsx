/**
 * PublicMatchDetailPage — Détail d'un match (accès public)
 * Screens : Résumé / Événements / Vidéo / Infos
 * Live vidéo WebRTC accessible sans connexion
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Link, useParams, useNavigate } from 'react-router-dom'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, MapPin, Calendar, Play, Share2, Zap, Trophy,
  Clock, Users, ExternalLink, BarChart2,
  TrendingUp,
} from 'lucide-react'

import { useMatch, useMatchBySlug } from '@/hooks/useMatches'
import { useRealtimeMatch } from '@/hooks/useRealtime'
import { useLiveClock, useMatchEvents } from '@/hooks/useMatchLive'
import { useActiveSeason } from '@/hooks/useSeasons'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { LiveEventFeed } from '@/components/live/LiveEventFeed'
import { LiveVideoPlayer } from '@/components/live/LiveVideoPlayer'
import { useWebRTCPresence } from '@/hooks/useWebRTCStream'
import { getRouteParamType } from '@/lib/routeHelpers'
import { MatchLineups } from '@/components/matches/MatchLineups'
import { PublicMatchPolls } from '@/components/matches/PublicMatchPolls'
import { PlayerAvatar } from '@/components/ui/PlayerAvatar'
import { clsx } from 'clsx'
import type { TeamRef } from '@/types/database'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { supabase } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type LiveTab = 'resume' | 'events' | 'live-video' | 'info' | 'lineups' | 'polls'

// ─────────────────────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Date inconnue'
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr))
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return '--:--'
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateStr))
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// TEAM BLOCK
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// SCORE BADGE
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// MATCH HERO
// ─────────────────────────────────────────────────────────────────────────────
function MatchHero({
  match, home, away, isLive, isCompleted, clock,
  sortedGoals, dark,
}: {
  match: any; home: TeamRef; away: TeamRef;
  isLive: boolean; isCompleted: boolean; clock: any;
  sortedGoals: any[];
  dark: boolean;
}) {
  const homeWon = isCompleted && (match.home_score ?? 0) > (match.away_score ?? 0)
  const awayWon = isCompleted && (match.away_score ?? 0) > (match.home_score ?? 0)

  const cardBg = dark
    ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 text-slate-100'
    : 'bg-gradient-to-br from-white via-slate-50 to-slate-100 text-slate-900'

  return (
    <div className={`relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-[var(--bd)] shadow-[var(--sh-card)] flex flex-col lg:h-full ${cardBg}`}>
      {/* bg glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[350px] h-[150px] blur-3xl opacity-[0.05] bg-[var(--t1)]" />
        {isLive && <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent animate-pulse" />}
      </div>

      {/* Card Header: Season and Matchday */}
      <div className="relative z-10 flex items-center justify-between gap-2 border-b border-[var(--bd)] pb-4 mb-6">
        <span className="text-[11px] font-black text-[var(--t2)] uppercase tracking-[0.2em] bg-[var(--bg-pill)] px-3 py-1 rounded-full">
          {match.seasons?.name ?? 'Saison'}
        </span>
        <span className="text-[11px] font-black text-[#C8F135] uppercase tracking-[0.2em] bg-[#C8F135]/15 border border-[#C8F135]/30 px-3 py-1 rounded-full">
          Journée {match.matchday}
        </span>
      </div>

      {/* Card Body: Teams and Score in a beautiful vertical layout */}
      <div className="relative z-10 flex flex-col items-center gap-4 sm:gap-6 my-auto">
        {/* Home Team */}
        <div className="flex items-center gap-4 w-full">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border border-[var(--bd)] shrink-0"
            style={{ backgroundColor: home.color }}>
            {home.logo_url
              ? <img src={home.logo_url} alt="" className="w-[62%] h-[62%] object-contain rounded-xl" />
              : <span className="text-2xl font-black text-white/90">{home.name[0]}</span>
            }
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-black text-[var(--t1)] truncate uppercase tracking-wide leading-tight">
              {home.name}
            </h3>
            {isCompleted && homeWon && (
              <span className="text-[10px] font-black text-[#C8F135] uppercase tracking-widest bg-[#C8F135]/15 px-2 py-0.5 rounded mt-1 inline-block">Vainqueur</span>
            )}
          </div>
          <motion.span 
            key={match.home_score}
            initial={isLive ? { scale: 1.5, color: '#C8F135' } : {}}
            animate={{ scale: 1, color: 'inherit' }}
            className="text-3xl font-black tabular-nums text-[var(--t1)]"
          >
            {match.home_score ?? 0}
          </motion.span>
        </div>

        {/* Separator / Live Status */}
        <div className="flex items-center justify-between w-full border-y border-[var(--bd)] py-3.5 px-1 my-2">
          {isLive ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none">En Direct</span>
            </div>
          ) : isCompleted ? (
            <span className="text-[10px] font-black text-[var(--t2)] uppercase tracking-[0.2em] bg-[var(--bg-pill)] px-2.5 py-1 rounded">Terminé</span>
          ) : (
            <span className="text-[10px] font-black text-[var(--t2)] uppercase tracking-[0.2em] bg-[var(--bg-pill)] px-2.5 py-1 rounded">À venir</span>
          )}

          {isLive && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg-pill)] border border-[var(--bd)]">
              <span className="text-[11px] font-black text-[var(--t1)] tabular-nums">
                {clock.phase === 3 ? '2e MT' : clock.phase === 2 ? 'Mi-temps' : '1re MT'}
              </span>
              <span className="text-[var(--tm)]">·</span>
              <span className="text-[11px] font-black text-[var(--t1)] font-mono">{clock.label}'</span>
            </div>
          )}

          {!isLive && !isCompleted && match.scheduled_at && (
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-[var(--tm)]" />
              <span className="text-xs font-black text-[var(--t1)] tabular-nums">{formatTime(match.scheduled_at)}</span>
            </div>
          )}

          {isCompleted && (
            <span className="text-[11px] font-bold text-[var(--t2)]">{formatDate(match.scheduled_at)}</span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center gap-4 w-full">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border border-[var(--bd)] shrink-0"
            style={{ backgroundColor: away.color }}>
            {away.logo_url
              ? <img src={away.logo_url} alt="" className="w-[62%] h-[62%] object-contain rounded-xl" />
              : <span className="text-2xl font-black text-white/90">{away.name[0]}</span>
            }
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-lg font-black text-[var(--t1)] truncate uppercase tracking-wide leading-tight">
              {away.name}
            </h3>
            {isCompleted && awayWon && (
              <span className="text-[10px] font-black text-[#C8F135] uppercase tracking-widest bg-[#C8F135]/15 px-2 py-0.5 rounded mt-1 inline-block">Vainqueur</span>
            )}
          </div>
          <motion.span 
            key={match.away_score}
            initial={isLive ? { scale: 1.5, color: '#C8F135' } : {}}
            animate={{ scale: 1, color: 'inherit' }}
            className="text-3xl font-black tabular-nums text-[var(--t1)]"
          >
            {match.away_score ?? 0}
          </motion.span>
        </div>
      </div>

      {/* Mini Scorers Timeline in card bottom */}
      {(isLive || isCompleted) && sortedGoals.length > 0 && (
        <div className="relative z-10 border-t border-[var(--bd)] mt-6 pt-4 flex-1 min-h-0 hidden sm:flex flex-col">
          <p className="text-[10px] font-black text-[var(--tm)] uppercase tracking-[0.15em] mb-2.5">Timeline des Buts</p>
          <div className="flex-1 overflow-y-auto pr-1 ns space-y-2 max-h-[140px]">
            {sortedGoals.map((g: any) => {
              const isHome = g.team_id === home.id
              const player = g.players
              const playerName = player ? `${player.first_name} ${player.last_name}` : '—'
              const teamColor = isHome ? home.color : away.color
              return (
                <div key={g.id} className={clsx(
                  "flex items-center gap-2.5 text-xs leading-none ci",
                  isHome ? "flex-row" : "flex-row-reverse text-right"
                )}>
                  <span className="text-[10px] text-[var(--tm)] font-mono font-black shrink-0 w-8">
                    {g.minute}'
                  </span>
                  <div className="min-w-0 flex-1 flex items-center gap-1.5" style={{ flexDirection: isHome ? 'row' : 'row-reverse' }}>
                    {player && (
                      <PlayerAvatar
                        firstName={player.first_name}
                        lastName={player.last_name}
                        avatarUrl={player.avatar_url ?? null}
                        teamColor={teamColor}
                        size={20}
                      />
                    )}
                    <p className="font-semibold text-[var(--t1)] truncate">{playerName}</p>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-[var(--bg-pill)] text-[var(--t1)] flex items-center justify-center font-black text-[10px] shrink-0">
                    ⚽
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Card Footer: Venue */}
      {match.venue && (
        <div className="relative z-10 border-t border-[var(--bd)] mt-auto pt-4 flex items-center gap-2 text-[11px] text-[var(--t2)] font-bold">
          <MapPin size={13} className="text-[#FFDF73]/80 shrink-0" />
          <span className="truncate">{match.venue}</span>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS SECTION
// ─────────────────────────────────────────────────────────────────────────────
function CardSection({ children, label, icon: Icon }: {
  children: React.ReactNode; label: string; icon: typeof Zap
}) {
  return (
    <div className="rounded-2xl border border-[var(--bd)] bg-[var(--bg-surface)] overflow-hidden shadow-[var(--sh-card)]">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--bd)] bg-[var(--bg-pill)]">
        <Icon size={16} className="text-[var(--t2)]" />
        <span className="text-xs font-black text-[var(--t2)] uppercase tracking-[0.2em]">{label}</span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORERS LIST
// ─────────────────────────────────────────────────────────────────────────────
function ScorersList({ sortedGoals, home, away, match }: {
  sortedGoals: any[]; home: TeamRef; away: TeamRef; match: any
}) {
  if (sortedGoals.length === 0) return null

  return (
    <CardSection label="Détail des Buteurs" icon={Trophy}>
      <div className="space-y-3">
        {sortedGoals.map((g: any) => {
          const isHome = g.team_id === home.id
          const player = g.players
          const isCSC = g.is_own_goal
          const playerName = player ? `${player.first_name} ${player.last_name}${isCSC ? ' (CSC)' : ''}` : '—'
          const teamColor = isHome ? home.color : away.color
          const assistRec = (match.assists ?? []).find((a: any) => a.goal_id === g.id)
          const assistPlayer = assistRec?.players
          const assistName = assistPlayer
            ? `${assistPlayer.first_name} ${assistPlayer.last_name}`
            : null
          return (
            <div key={g.id} className={clsx(
              "flex items-center w-full gap-4 py-2.5 border-b border-[var(--bd)]/20 last:border-b-0",
              isHome ? "flex-row" : "flex-row-reverse text-right"
            )}>
              {/* Event Icon / Minute */}
              <div className={clsx("flex items-center gap-2.5 shrink-0", isHome ? "flex-row" : "flex-row-reverse")}>
                <span className="w-7 h-7 rounded-full bg-[var(--bg-pill)] text-[var(--t1)] flex items-center justify-center font-black text-xs border border-[var(--bd)]">⚽</span>
                <span className="text-xs text-[var(--t2)] font-mono font-black">{g.minute}'</span>
              </div>

              {/* Player details */}
              <div className={clsx("flex items-center gap-2.5 min-w-0", !isHome && "flex-row-reverse")}>
                {player && (
                  <PlayerAvatar
                    firstName={player.first_name}
                    lastName={player.last_name}
                    avatarUrl={player.avatar_url ?? null}
                    teamColor={teamColor}
                    size={32}
                  />
                )}
                 <div className="min-w-0">
                  <p className="text-sm font-bold text-[var(--t1)] truncate">{playerName} {g.is_penalty ? <span className="text-[9px] font-black text-yellow-600 uppercase tracking-wider ml-1">PK</span> : ''}</p>
                  {assistName && (
                    <p className={clsx("text-[11px] text-[var(--tm)] mt-0.5", !isHome && "text-right")}>
                      Passe : <span className="text-[var(--t2)] font-bold">{assistName}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Spacer to push to opposite sides */}
              <div className="flex-1" />
            </div>
          )
        })}
      </div>
    </CardSection>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB BAR
// ─────────────────────────────────────────────────────────────────────────────
function TabBar({ tabs, activeTab, onChange, dark }: {
  tabs: LiveTab[]; activeTab: LiveTab; onChange: (id: LiveTab) => void; dark: boolean
}) {
  if (tabs.length <= 1) return null
  return (
    <div className={`sticky top-16 z-30 rounded-2xl border backdrop-blur-xl transition-all duration-300 ${dark ? 'border-white/[0.06] bg-[#0D1117]/90' : 'border-black/[0.06] bg-white/90'
      }`}>
      <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={clsx(
              'flex-shrink-0 flex items-center gap-2 px-5 py-4 text-xs font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all',
              activeTab === tab
                ? 'text-[#C8F135] border-b-[2.5px] !border-[#C8F135]'
                : 'text-[var(--t2)] border-b-2 border-transparent hover:text-[var(--t1)]'
            )}
          >
            {tab === 'resume' && <><Calendar size={14} />Résumé</>}
            {tab === 'events' && <><Zap size={14} />Événements</>}
            {tab === 'lineups' && <><Users size={14} />Compos</>}
            {tab === 'live-video' && <><Play size={14} />{activeTab === 'live-video' ? 'En direct' : 'Vidéo'}</>}
            {tab === 'info' && <><MapPin size={14} />Infos</>}
            {tab === 'polls' && <><BarChart2 size={14} />Pronostics</>}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// INFO SECTION
// ─────────────────────────────────────────────────────────────────────────────
function InfoSection({ match, season }: { match: any; season: any }) {
  const mapsHref = match.venue ? `https://maps.google.com/?q=${encodeURIComponent(match.venue)}` : null
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--bd)] bg-[var(--bg-surface)] p-6 space-y-5 shadow-[var(--sh-card)] text-[var(--t1)]">
        {match.venue && (
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-[#FFDF73]/80 shrink-0" />
            <span className="text-base font-semibold text-[var(--t1)] truncate">{match.venue}</span>
            {mapsHref && (
              <a href={mapsHref} target="_blank" rel="noreferrer" className="ml-auto text-xs text-blue-500 hover:text-blue-400 hover:underline flex items-center gap-1 shrink-0">
                Maps <ExternalLink size={12} />
              </a>
            )}
          </div>
        )}
        <div className="flex items-center gap-2.5 text-xs text-[var(--t2)] font-bold uppercase tracking-widest">
          <Calendar size={13} className="text-[var(--tm)]" />
          {formatDate(match.scheduled_at)}
        </div>
        <div className="flex items-center gap-2.5 text-xs text-[var(--t2)] font-bold uppercase tracking-widest">
          <Trophy size={13} className="text-[var(--tm)] shrink-0" />
          {season?.name ?? 'Saison'}
        </div>
        <div className="flex items-center gap-2.5 text-xs text-[var(--t2)] font-bold uppercase tracking-widest">
          <Users size={13} className="text-[var(--tm)] shrink-0" />
          Journée {match.matchday}
        </div>
        {match.status === 'completed' && typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={async () => {
              const hs = match.home_score ?? 0
              const as_ = match.away_score ?? 0
              const draw = hs === as_
              try {
                await (navigator as { share?: (data: { title: string; text: string; url: string }) => Promise<void> }).share({
                  title: draw
                    ? `Match nul : ${match.home_team.name} ${hs} – ${as_} ${match.away_team.name}`
                    : `${match.home_team.name} ${hs} – ${as_} ${match.away_team.name}`,
                  text: draw
                    ? `${match.home_team.name} et ${match.away_team.name} se quittent sur un match nul (${hs}–${as_}) · League H5`
                    : `${match.home_team.name} s'impose ${hs}–${as_} face à ${match.away_team.name} · League H5`,
                  url: window.location.href,
                })
              } catch {
                // Native sharing can be cancelled by the user.
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-[var(--t2)] border border-[var(--bd)] hover:bg-[var(--bg-pill)] hover:text-[var(--t1)] transition-all cursor-pointer"
          >
            <Share2 size={14} />
            Partager le résultat
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GOAL OVERLAY
// ─────────────────────────────────────────────────────────────────────────────
function GoalOverlay({ teamName, teamColor, score }: { teamName: string; teamColor: string; score: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.5, y: 100 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 1.5, opacity: 0 }}
        className="relative z-10 flex flex-col items-center"
      >
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [-5, 5, -5, 5, 0]
          }}
          transition={{ duration: 0.5, repeat: 5 }}
          className="text-8xl sm:text-[12rem] font-black italic text-white drop-shadow-[0_0_50px_rgba(255,255,255,0.5)] font-['Barlow_Condensed'] uppercase"
        >
          BUT !
        </motion.div>
        
        <div 
          className="px-8 py-4 rounded-2xl border-4 shadow-2xl flex flex-col items-center gap-2 mt-[-20px]"
          style={{ backgroundColor: teamColor, borderColor: 'white' }}
        >
          <span className="text-xl sm:text-3xl font-black text-white uppercase tracking-tighter">
            {teamName}
          </span>
          <span className="text-4xl sm:text-6xl font-black text-white tabular-nums">
            {score}
          </span>
        </div>
        
        <div className="mt-8 flex gap-4">
          {[1,2,3,4,5].map(i => (
            <motion.span
              key={i}
              initial={{ y: 0 }}
              animate={{ y: [-20, 0] }}
              transition={{ duration: 0.3, repeat: Infinity, delay: i * 0.1 }}
              className="text-4xl"
            >
              ⚽
            </motion.span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── MATCH MOMENTUM (MOBILE OPTIMIZED) ──
function MatchMomentum({ events, homeId }: { events: any[]; homeId: string }) {
  const momentum = useMemo(() => {
    const recentEvents = events
      .filter(e => ['shot', 'shot_on_target', 'corner', 'foul', 'goal'].includes(e.type))
      .slice(-10)
    
    if (recentEvents.length === 0) return 50
    
    let homeScore = 0
    let awayScore = 0
    
    recentEvents.forEach(e => {
      const weight = e.type === 'goal' ? 5 : e.type === 'shot_on_target' ? 3 : e.type === 'shot' ? 2 : 1
      if (e.team_id === homeId) homeScore += weight
      else awayScore += weight
    })
    
    return (homeScore / (homeScore + awayScore)) * 100
  }, [events, homeId])

  return (
    <div className="card p-3 sm:p-4 space-y-2 sm:space-y-3">
      <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-[var(--t2)]">
        <span className="flex items-center gap-1.5">
          <TrendingUp size={12} className="text-primary-500" />
          Pression
        </span>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="hidden sm:inline">Domicile</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="hidden sm:inline">Extérieur</span>
          </div>
        </div>
      </div>
      <div className="relative h-2 sm:h-3 bg-surface-raised rounded-full overflow-hidden border border-[var(--bd)]">
        <motion.div 
          animate={{ width: `${momentum}%` }}
          className="absolute left-0 top-0 h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
        />
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 z-10" />
      </div>
    </div>
  )
}

// ── LAST EVENT TICKER ──
function LiveTicker({ event }: { event?: any }) {
  if (!event) return null
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400"
    >
      <span className="text-[10px] font-black tabular-nums">{event.minute}'</span>
      <div className="w-px h-3 bg-primary-500/20" />
      <span className="text-[10px] font-bold uppercase tracking-wide truncate max-w-[150px]">
        {event.type === 'goal' ? '⚽ BUT !' : event.type === 'shot_on_target' ? '🎯 Tir Cadré' : event.type === 'shot' ? '🥅 Tir' : event.type === 'foul' ? '⚠️ Faute' : '🚩 Corner'}
      </span>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function PublicMatchDetailPage() {
  const navigate = useNavigate()
  const { idOrSlug } = useParams<{ idOrSlug: string }>()
  const { data: season } = useActiveSeason()

  const [showGoalOverlay, setShowGoalOverlay] = useState<{ teamName: string; teamColor: string; score: string } | null>(null)
  const prevScoreRef = useRef<{ home: number; away: number } | null>(null)
  const goalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const paramType = idOrSlug ? getRouteParamType(idOrSlug) : 'id'

  const { data: matchById, isLoading: loadingById } = useMatch(paramType === 'id' ? idOrSlug : undefined)
  const { data: matchBySlug, isLoading: loadingBySlug } = useMatchBySlug(
    paramType === 'slug' ? idOrSlug : undefined, season?.id
  )

  const match = paramType === 'id' ? matchById : matchBySlug
  const isLoading = paramType === 'id' ? loadingById : loadingBySlug
  const id = match?.id

  // ── Effet pour détecter un nouveau but ─────────────────────────────────────
  useEffect(() => {
    if (!match || match.status !== 'live') return

    const currentScore = { home: match.home_score ?? 0, away: match.away_score ?? 0 }

    if (prevScoreRef.current) {
      const homeGoal = currentScore.home > prevScoreRef.current.home
      const awayGoal = currentScore.away > prevScoreRef.current.away

      if (homeGoal || awayGoal) {
        const team = homeGoal ? match.home_team : match.away_team
        setShowGoalOverlay({
          teamName: team?.name ?? 'Équipe',
          teamColor: team?.color ?? '#C8F135',
          score: `${currentScore.home}-${currentScore.away}`
        })
        goalTimeoutRef.current = setTimeout(() => setShowGoalOverlay(null), 5000)
      }
    }

    prevScoreRef.current = currentScore

    return () => {
      if (goalTimeoutRef.current) {
        clearTimeout(goalTimeoutRef.current)
        goalTimeoutRef.current = null
      }
    }
  }, [match])

  const [activeTab, setActiveTab] = useState<LiveTab>(() => {
    // Si l'URL contient ?tab=lineups, on ouvre directement l'onglet compositions
    const params = new URLSearchParams(window.location.search)
    const requestedTab = params.get('tab') as LiveTab
    if (requestedTab === 'lineups') return 'lineups'
    return 'resume'
  })

  // Theme support
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const s = localStorage.getItem('mr-theme')
    return s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const handleTheme = () => {
      const s = localStorage.getItem('mr-theme')
      setDark(s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
    window.addEventListener('theme-changed', handleTheme)
    return () => window.removeEventListener('theme-changed', handleTheme)
  }, [])

  // ── Realtime ────────────────────────────────────────────────────────────
  useRealtimeMatch(id)

  const eventLoopEnabled = (match as { events_enabled?: boolean })?.events_enabled ?? false
  const fetchedOnceRef = useRef(false)

  const pollEvents = useCallback(async () => {
    if (!id || fetchedOnceRef.current || !eventLoopEnabled) return
    try {
      const { data } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', id)
        .order('created_at', { ascending: true })
      if ((data ?? []).length === 0) fetchedOnceRef.current = true
    } catch { fetchedOnceRef.current = true }
  }, [id, eventLoopEnabled])

  useEffect(() => {
    void pollEvents()
  }, [pollEvents])

  const { data: liveEvents = [] } = useMatchEvents(id)

  // ── Chrono live ─────────────────────────────────────────────────────────
  const clock = useLiveClock(
    match?.live_started_at ?? null,
    (match as { live_period?: 1 | 2 | null })?.live_period ?? null,
    match?.status ?? 'scheduled',
    (match as { halftime_at?: string })?.halftime_at,
    match?.is_paused ?? false,
    match?.paused_at ?? null,
    match?.total_paused_seconds ?? 0,
  )

  // ── Derived ─────────────────────────────────────────────────────────────
  const home = match?.home_team as TeamRef | undefined
  const away = match?.away_team as TeamRef | undefined
  const goals = useMemo(() => (match?.goals ?? []) as unknown[], [match])

  const isLive = match?.status === 'live'
  const isCompleted = match?.status === 'completed'

  // ── Présence : l'onglet vidéo s'affiche dès que le match est 'live' en DB
  // useWebRTCPresence gardé uniquement pour le viewerCount
  const { viewerCount } = useWebRTCPresence(id ?? '')
  const isStreamingLive = isLive

  const sortedGoals = useMemo(() => [...(goals ?? [])].sort((a: { minute?: number }, b: { minute?: number }) => (a.minute ?? 0) - (b.minute ?? 0)), [goals])
  const hasLiveVideoTab = isLive && isStreamingLive

  const tabList: LiveTab[] = ['resume', 'events', 'lineups']
  if (hasLiveVideoTab) tabList.unshift('live-video')
  tabList.push('info')
  tabList.push('polls')

  // ── Loading ─────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center py-32"><LoadingSpinner size="lg" /></div>
      </PublicLayout>
    )
  }

  // ── Not found ───────────────────────────────────────────────────────────
  if (!match || !home || !away) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center gap-6 py-32 text-center">
          <p className="text-[var(--t2)] font-black uppercase tracking-widest text-xs">Match introuvable</p>
          <Link to="/public/matches"
            className="px-6 py-3 rounded-xl bg-[var(--bg-surface)] text-[var(--t1)] text-xs font-bold
                       hover:bg-[var(--bg-surface-h)] transition-colors border border-[var(--bd)] shadow-[var(--sh-card)]">
            Retour aux matchs
          </Link>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout hideFooter>
      <AnimatePresence>
        {showGoalOverlay && (
          <GoalOverlay 
            teamName={showGoalOverlay.teamName}
            teamColor={showGoalOverlay.teamColor}
            score={showGoalOverlay.score}
          />
        )}
      </AnimatePresence>

      {/* ── STICKY MINI SCOREBOARD (MOBILE ONLY) ── */}
      {isLive && (
        <div className="sticky top-0 z-[40] sm:hidden bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--bd)] py-2 px-4 shadow-lg animate-fade-in-down">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                <span className="text-[10px] font-black text-[var(--t1)] tabular-nums">{clock.label}'</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-[var(--t1)] uppercase tracking-tighter truncate max-w-[60px]">{home.name.split(' ')[0]}</span>
                  <span className="text-lg font-black text-[var(--t1)] tabular-nums">{match.home_score ?? 0}</span>
                </div>
                <span className="text-[var(--tm)] font-bold text-xs">-</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black text-[var(--t1)] tabular-nums">{match.away_score ?? 0}</span>
                  <span className="text-xs font-black text-[var(--t1)] uppercase tracking-tighter truncate max-w-[60px]">{away.name.split(' ')[0]}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-[var(--t2)] font-bold">
                <Users size={12} />
                <span>{viewerCount ?? 0}</span>
              </div>
            </div>
            
            {/* Mini Ticker in Sticky Header */}
            {liveEvents.length > 0 && (
              <div className="flex justify-center pb-1">
                <LiveTicker event={liveEvents[liveEvents.length - 1]} />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:overflow-hidden pt-4 pb-4 px-4 max-w-7xl mx-auto w-full gap-4 min-h-0">

        {/* Back link */}
        <div className="flex-shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-bold
                       text-[var(--t2)] hover:text-[var(--t1)] uppercase tracking-wider transition-colors"
          >
            <ArrowLeft size={14} />
            Retour aux matchs
          </button>
        </div>

        {/* Main Grid Workspace */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-5 lg:overflow-hidden">
          {/* LEFT SIDEBAR: Match Hero Card + Momentum */}
          <div className="lg:w-[420px] shrink-0 flex flex-col min-h-0 lg:h-full gap-5">
            <MatchHero
              match={match}
              home={home}
              away={away}
              isLive={isLive}
              isCompleted={isCompleted}
              clock={clock}
              sortedGoals={sortedGoals}
              dark={dark}
            />

            {isLive && (
              <div className="space-y-5">
                <MatchMomentum events={liveEvents} homeId={home.id} />
                
                <div className="rounded-2xl border border-[var(--bd)] bg-red-500/[0.02] p-5 shadow-[var(--sh-card)]">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-red-500/80 mb-4 flex items-center gap-2">
                    <Zap size={14} /> Flux Live (Derniers faits)
                  </h3>
                  <div className="max-h-[300px] overflow-y-auto pr-2 ns">
                    <LiveEventFeed
                      events={liveEvents.slice(-5)}
                      homeTeamId={home.id}
                      homeColor={home.color}
                      awayColor={away.color}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Tab Bar + Tab Content */}
          <div className="flex-1 min-h-0 flex flex-col bg-[var(--bg-surface)] border border-[var(--bd)] rounded-3xl shadow-[var(--sh-card)] lg:overflow-hidden">
            <div className="flex-shrink-0">
              <TabBar tabs={tabList} activeTab={activeTab} onChange={setActiveTab} dark={dark} />
            </div>

            {/* Tab content container scrolls internally */}
            <div className="flex-1 lg:overflow-y-auto p-6 ns">
              <AnimatePresence mode="wait">

                {/* RÉSUMÉ */}
                {activeTab === 'resume' && (
                  <motion.div key="resume" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="space-y-4 pt-1">
                    {(isLive || isCompleted) && sortedGoals.length > 0 && (
                      <ScorersList sortedGoals={sortedGoals} home={home} away={away} match={match} />
                    )}
                    <InfoSection match={match} season={season} />
                  </motion.div>
                )}

                {/* ÉVÉNEMENTS */}
                {activeTab === 'events' && (
                  <motion.div key="events" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="pt-1">
                    {liveEvents.length > 0 ? (
                      <CardSection label="Événements du match" icon={Zap}>
                        <LiveEventFeed events={liveEvents} homeTeamId={home.id} homeColor={home.color} awayColor={away.color} />
                      </CardSection>
                    ) : (
                      <div className="rounded-2xl border border-[var(--bd)] bg-[var(--bg-surface)] p-10 text-center shadow-[var(--sh-card)]">
                        <Zap size={28} className="mx-auto mb-3 text-[var(--tm)]" />
                        <p className="text-[12px] font-black text-[var(--t2)] uppercase tracking-[0.2em]">Aucun événement</p>
                        <p className="text-xs text-[var(--tm)] mt-2">Les événements apparaîtront ici en direct</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* COMPOSITIONS */}
                {activeTab === 'lineups' && (
                  <motion.div key="lineups" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="pt-1">
                    <MatchLineups matchId={id!} homeTeam={home} awayTeam={away} scheduledAt={match?.scheduled_at} />
                  </motion.div>
                )}

                {/* LIVE VIDEO — WebRTC */}
                {activeTab === 'live-video' && isLive && isStreamingLive && (
                  <motion.div key="live-video" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="space-y-4 pt-1">
                    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/[0.07] border border-red-500/[0.18]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                      <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.25em]">Diffusion en direct</span>
                      <span className="ml-auto text-xs text-[var(--t2)] font-bold uppercase">
                        {viewerCount ?? 0} viewer{(viewerCount ?? 0) > 1 ? 's' : ''}
                      </span>
                    </div>

                    <LiveVideoPlayer
                      matchId={match.id}
                      viewerMode
                      events={liveEvents}
                      homeTeam={home}
                      awayTeam={away}
                      overlay={{
                        homeName: home.name,
                        awayName: away.name,
                        homeScore: match.home_score ?? 0,
                        awayScore: match.away_score ?? 0,
                        clockLabel: clock.label,
                        period: clock.phase === 2 ? 'Mi-temps' : clock.phase === 3 ? '2e MT' : '1re MT',
                        isPaused: clock.isPaused ?? false,
                        homeColor: home.color,
                        awayColor: away.color,
                        viewerCount: viewerCount ?? 0,
                      }}
                    />
                  </motion.div>
                )}

                {/* PRONOSTICS */}
                {activeTab === 'polls' && (
                  <motion.div key="polls" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="pt-1">
                    <PublicMatchPolls matchId={id!} />
                  </motion.div>
                )}

                {/* INFOS */}
                {activeTab === 'info' && (
                  <motion.div key="info" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="pt-1">
                    <InfoSection match={match} season={season} />
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}

// Export alias
export { PublicMatchDetailPage as default }
