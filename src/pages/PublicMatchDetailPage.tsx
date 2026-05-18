/**
 * PublicMatchDetailPage — Détail d'un match (accès public)
 * Screens : Résumé / Événements / Vidéo / Infos
 * Live vidéo WebRTC accessible sans connexion
 */

import { Link, useParams, useNavigate } from 'react-router-dom'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, MapPin, Calendar, Play, Share2, Zap, Trophy,
  Radio, Clock, Users, ExternalLink, Video,
} from 'lucide-react'

import { useMatch, useMatchBySlug }          from '@/hooks/useMatches'
import { useRealtimeMatch }                    from '@/hooks/useRealtime'
import { useLiveClock, useMatchEvents }        from '@/hooks/useMatchLive'
import { useActiveSeason }                     from '@/hooks/useSeasons'
import { LoadingSpinner }                      from '@/components/ui/LoadingSpinner'
import { LiveBadge }                           from '@/components/live/LiveBadge'
import { LiveEventFeed }                       from '@/components/live/LiveEventFeed'
import { LiveVideoPlayer }                     from '@/components/live/LiveVideoPlayer'
import { useWebRTCViewer }                     from '@/hooks/useWebRTCStream'
import { getRouteParamType }                   from '@/lib/routeHelpers'
import { clsx }                                from 'clsx'
import type { TeamRef }                        from '@/types/database'
import { PublicLayout }                        from '@/components/layout/PublicLayout'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type LiveTab = 'resume' | 'events' | 'live-video' | 'info'

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

function getEmbedUrl(url: string | null): string | null {
  if (!url) return null
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/)
  if (yt?.[1]) return `https://www.youtube.com/embed/${yt[1]}?autoplay=0&rel=0`
  const tw = url.match(/twitch\.tv\/([^/?]+)/)
  if (tw?.[1]) return `https://player.twitch.tv/?channel=${tw[1]}&parent=${window.location.hostname}&muted=true`
  return url
}

function cs(cond: boolean, ...classes: string[]) {
  return cond ? classes.join(' ') : ''
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildScoreClass(isLive: boolean, faded: boolean): string {
  if (isLive) return 'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-500/15 border border-red-500/35 shadow-[0_0_28px_rgba(239,68,68,0.14)]'
  if (!faded) return 'flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.1]'
  return 'flex items-center gap-1 px-3.5 py-2 rounded-xl bg-white/0 border border-white/[0.07]'
}

function buildHeroClass(isLive: boolean): string {
  const base = 'relative overflow-hidden rounded-3xl p-6 sm:p-8'
  if (isLive) return `${base} border border-red-500/25 bg-gradient-to-br from-red-950/15 via-[#161c2d] to-[#161c2d]`
  return `${base} border border-white/[0.07] bg-gradient-to-br from-[#1a2035]/70 via-[#161c2d] to-[#161c2d]`
}

function buildGlowClass(isLive: boolean): string {
  const base = 'absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] blur-3xl'
  if (isLive) return `${base} opacity-[0.07] bg-red-500`
  return `${base} opacity-[0.04] bg-white`
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM BLOCK
// ─────────────────────────────────────────────────────────────────────────────
function TeamInline({ name, color, logoUrl }: { name: string; color: string; logoUrl?: string | null }) {
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0"
      style={{ backgroundColor: color }}>
      {logoUrl
        ? <img src={logoUrl} alt="" className="w-7 h-7 object-contain rounded-lg" />
        : <span className="text-[11px] font-black">{name[0]}</span>
      }
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE BADGE
// ─────────────────────────────────────────────────────────────────────────────
function ScoreBadge({ homeScore, awayScore, isLive, liveLabel, faded }:
  { homeScore: number; awayScore: number; isLive?: boolean; liveLabel?: string; faded?: boolean }
) {
  if (isLive) {
    return (
      <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-500/15 border border-red-500/35 shadow-[0_0_28px_rgba(239,68,68,0.14)]">
        <span className="text-[1.65rem] font-black tabular-nums text-white leading-none">{homeScore}</span>
        <span className="text-red-500/50 font-black text-sm leading-none">:</span>
        <span className="text-[1.65rem] font-black tabular-nums text-white leading-none">{awayScore}</span>
        {liveLabel && (
          <span className="flex items-center gap-1 text-[9px] font-black text-red-400 uppercase tracking-wider leading-none ml-0.5 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            {liveLabel}
          </span>
        )}
      </div>
    )
  }
  const scoreClass = buildScoreClass(false, faded === true)
  return (
    <div className={scoreClass}>
      <span className="text-xl font-black tabular-nums text-slate-100">{homeScore ?? '0'}</span>
      <span className="text-slate-600 font-black text-sm">:</span>
      <span className="text-xl font-black tabular-nums text-slate-100">{awayScore ?? '0'}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MATCH HERO
// ─────────────────────────────────────────────────────────────────────────────
function MatchHero({
  match, home, away, goals, isLive, isCompleted, clock,
  sortedGoals, homeScorers, awayScorers,
}: {
  match: any; home: TeamRef; away: TeamRef; goals: any[];
  isLive: boolean; isCompleted: boolean; clock: any;
  sortedGoals: any[]; homeScorers: any[]; awayScorers: any[];
}) {
  const homeWon = isCompleted && (match.home_score ?? 0) > (match.away_score ?? 0)
  const awayWon = isCompleted && (match.away_score ?? 0) > (match.home_score ?? 0)

  const heroClass = buildHeroClass(isLive)
  const glowClass = buildGlowClass(isLive)

  return (
    <div className={heroClass}>
      {/* bg glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={glowClass} />
        {isLive && <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />}
      </div>

      <div className="relative z-10 flex flex-col items-center">

        {/* Season / venue / date */}
        <div className="flex items-center gap-2 mb-5 px-2 flex-wrap justify-center">
          <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07]">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">
              {match.seasons?.name ?? 'Saison'}
            </span>
          </span>
          {match.venue && (
            <>
              <span className="text-slate-700">·</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <MapPin size={9} className="text-[#FFDF73]/60" /> {match.venue}
              </span>
            </>
          )}
          {match.scheduled_at && !isLive && !isCompleted && (
            <>
              <span className="text-slate-700">·</span>
              <span className="text-[10px] font-bold text-slate-500">{formatDate(match.scheduled_at)}</span>
            </>
          )}
        </div>

        {/* TEAMS + SCORE */}
        <div className="flex items-center justify-center gap-4 sm:gap-12 w-full max-w-lg">

          {/* HOME */}
          <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-xl border border-white/[0.07]"
              style={{ backgroundColor: home.color }}
            >
              {home.logo_url
                ? <img src={home.logo_url} alt="" className="w-[58%] h-[58%] object-contain rounded-xl" />
                : <span className="text-2xl font-black text-white/90">{home.name[0]}</span>
              }
            </div>
            <p className="text-xs sm:text-sm font-black text-white/90 text-center leading-tight truncate max-w-full">
              {home.name}
            </p>
          </div>

          {/* SCORE CENTER */}
          <div className="flex flex-col items-center gap-2.5 shrink-0">
            <ScoreBadge
              homeScore={match.home_score ?? 0}
              awayScore={match.away_score ?? 0}
              isLive={isLive}
              liveLabel={
                isLive
                  ? clock.isPaused
                    ? '⏸ Suspendu'
                    : clock.phase === 3
                    ? `${clock.label} — 2e MT`
                    : clock.phase === 2
                    ? 'Mi-temps'
                    : `${clock.label}'`
                  : undefined
              }
            />
            {isLive && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                <span className={cs(!clock.isPaused,
                  'w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse',
                  'w-1.5 h-1.5 rounded-full bg-amber-500')}
                />
                <span className="text-[9px] font-black text-white tabular-nums">{clock.label}</span>
              </div>
            )}
            {!isLive && !isCompleted && match.scheduled_at && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                <Clock size={10} className="text-slate-500" />
                <span className="text-[9px] font-black text-slate-400 tabular-nums">{formatTime(match.scheduled_at)}</span>
              </div>
            )}
            {isCompleted && !homeWon && !awayWon && (
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.15em]">Match nul</span>
            )}
          </div>

          {/* AWAY */}
          <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-xl border border-white/[0.07]"
              style={{ backgroundColor: away.color }}
            >
              {away.logo_url
                ? <img src={away.logo_url} alt="" className="w-[58%] h-[58%] object-contain rounded-xl" />
                : <span className="text-2xl font-black text-white/90">{away.name[0]}</span>
              }
            </div>
            <p className="text-xs sm:text-sm font-black text-white/90 text-center leading-tight truncate max-w-full">
              {away.name}
            </p>
          </div>
        </div>

        {/* SCORERS */}
        {(isLive || isCompleted) && sortedGoals.length > 0 && (
          <div className="mt-5 w-full max-w-md border-t border-white/[0.06] pt-4">
            {homeScorers.length > 0 && (
              <div className="flex flex-col items-end gap-1 mb-1.5">
                {homeScorers.map((g: any) => {
                  const playerName = g.players ? `${g.players.first_name} ${g.players.last_name}` : '—'
                  const assistRec  = (match.assists ?? []).find((a: any) => a.goal_id === g.id)
                  const assistName = assistRec?.players
                    ? `${assistRec.players.first_name} ${assistRec.players.last_name}`
                    : null
                  return (
                    <div key={g.id} className="flex items-center gap-2 text-right">
                      <div>
                        <p className="text-xs font-bold text-white/70 leading-tight">{playerName}</p>
                        {assistName && (
                          <p className="text-[10px] text-slate-500 mt-0.5">Passe <span className="text-slate-400">{assistName}</span></p>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-600 font-mono font-black">{g.minute}'</span>
                    </div>
                  )
                })}
              </div>
            )}
            {homeScorers.length > 0 && awayScorers.length > 0 && (
              <div className="border-t border-white/[0.05] my-1.5" />
            )}
            {awayScorers.length > 0 && (
              <div className="flex flex-col items-start gap-1">
                {awayScorers.map((g: any) => {
                  const playerName = g.players ? `${g.players.first_name} ${g.players.last_name}` : '—'
                  const assistRec  = (match.assists ?? []).find((a: any) => a.goal_id === g.id)
                  const assistName = assistRec?.players
                    ? `${assistRec.players.first_name} ${assistRec.players.last_name}`
                    : null
                  return (
                    <div key={g.id} className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-600 font-mono font-black">{g.minute}'</span>
                      <div>
                        <p className="text-xs font-bold text-white/70 leading-tight">{playerName}</p>
                        {assistName && (
                          <p className="text-[10px] text-slate-500 mt-0.5">Passe <span className="text-slate-400">{assistName}</span></p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* MATCHDAY */}
        <div className="mt-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.07]">
          <Calendar size={10} className="text-slate-500" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Journée {match.matchday}</span>
          {!isLive && !isCompleted && match.scheduled_at && (
            <>
              <span className="text-slate-700 mx-1">·</span>
              <Clock size={10} className="text-slate-600" />
              <span className="text-[10px] font-bold text-slate-500">{formatTime(match.scheduled_at)}</span>
            </>
          )}
        </div>
      </div>
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
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07] bg-white/[0.015]">
        <Icon size={14} className="text-slate-500" />
        <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">{label}</span>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO EMBED
// ─────────────────────────────────────────────────────────────────────────────
function VideoEmbed({ url, title }: { url: string | null; title: string }) {
  if (!url) return null
  const embedUrl = getEmbedUrl(url)
  if (!embedUrl) return (
    <div className="card p-6 text-center">
      <p className="text-xs text-slate-500">Vidéo non supportée</p>
      <a href={url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline mt-2 inline-block">
        Ouvrir {url}
      </a>
    </div>
  )
  return (
    <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-black shadow-2xl">
      <div className="aspect-video relative">
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title={title}
        />
      </div>
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
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07] bg-white/[0.015]">
        <Trophy size={14} className="text-amber-400/50" />
        <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Buteurs</span>
      </div>
      <div className="px-4 py-3 space-y-1">
        {sortedGoals.map((g: any) => {
          const isHome = g.team_id === home.id
          const playerName = g.players ? `${g.players.first_name} ${g.players.last_name}` : '—'
          const assistRec  = (match.assists ?? []).find((a: any) => a.goal_id === g.id)
          const assistName = assistRec?.players
            ? `${assistRec.players.first_name} ${assistRec.players.last_name}`
            : null
          return (
            <div key={g.id}
              className={clsx('flex items-center justify-center gap-2 py-1.5',
                isHome ? 'flex-row-reverse' : '')}>
              <div className="flex-1 text-center min-w-0">
                <p className="text-xs font-bold text-white/80 leading-tight truncate">{playerName}</p>
                {assistName && <p className="text-[10px] text-slate-500 mt-0.5">Passe <span className="text-slate-400">{assistName}</span></p>}
              </div>
              <span className="text-[11px] text-slate-600 font-mono font-black w-6 text-right">{g.minute}'</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB BAR
// ─────────────────────────────────────────────────────────────────────────────
function TabBar({ tabs, activeTab, onChange }: {
  tabs: LiveTab[]; activeTab: LiveTab; onChange: (id: LiveTab) => void
}) {
  if (tabs.length <= 1) return null
  return (
    <div className="sticky top-[56px] z-30 mx-2 rounded-2xl border border-white/[0.06] bg-[#0D1117]/90 backdrop-blur-xl">
      <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={clsx(
              'flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-all',
              activeTab === tab
                ? 'text-[#C8F135] border-b-[2.5px] !border-[#C8F135]'
                : 'text-slate-500 border-b-2 border-transparent hover:text-slate-300'
            )}
          >
            {tab === 'resume' && <><Calendar size={13} />Résumé</>}
            {tab === 'events' && <><Zap size={13} />Événements</>}
            {tab === 'live-video' && <><Play size={13} />{activeTab === 'live-video' ? 'En direct' : 'Vidéo'}</>}
            {tab === 'info' && <><MapPin size={13} />Infos</>}
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
    <div className="space-y-3">
      {match.video_url && (match.status === 'live' || match.status === 'completed') && (
        <div className="rounded-2xl overflow-hidden border border-white/[0.08] bg-black shadow-2xl">
          <div className="aspect-video relative">
            {(() => {
              const embedUrl = getEmbedUrl(match.video_url)
              if (!embedUrl) return (
                <div className="card p-6 h-full flex flex-col items-center justify-center">
                  <p className="text-xs text-slate-500">Vidéo non supportée</p>
                  <a href={match.video_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline mt-2">
                    Ouvrir {match.video_url}
                  </a>
                </div>
              )
              return (
                <iframe
                  src={embedUrl}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  title="Vidéo du match"
                />
              )
            })()}
          </div>
        </div>
      )}
      <div className="card p-5 space-y-4">
        {match.venue && (
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-[#FFDF73]/60 shrink-0" />
            <span className="text-sm font-semibold text-slate-200 truncate">{match.venue}</span>
            {mapsHref && (
              <a href={mapsHref} target="_blank" rel="noreferrer" className="ml-auto text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0">
                Maps <ExternalLink size={10} />
              </a>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <Calendar size={11} />
          {formatDate(match.scheduled_at)}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <Trophy size={11} className="text-slate-600 shrink-0" />
          {season?.name ?? 'Saison'}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
          <Users size={11} className="text-slate-600 shrink-0" />
          Journée {match.matchday}
        </div>
        {match.status === 'completed' && typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={async () => {
              const hs = match.home_score ?? 0
              const as_ = match.away_score ?? 0
              const draw = hs === as_
              try {
                await (navigator as any).share({
                  title: draw
                    ? `Match nul : ${match.home_team.name} ${hs} – ${as_} ${match.away_team.name}`
                    : `${match.home_team.name} ${hs} – ${as_} ${match.away_team.name}`,
                  text: draw
                    ? `${match.home_team.name} et ${match.away_team.name} se quittent sur un match nul (${hs}–${as_}) · League H5`
                    : `${match.home_team.name} s'impose ${hs}–${as_} face à ${match.away_team.name} · League H5`,
                  url: window.location.href,
                })
              } catch { }
            }}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-bold text-slate-500 border border-white/[0.07] hover:border-white/20 hover:text-slate-300 transition-all cursor-pointer"
          >
            <Share2 size={12} />
            Partager le résultat
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function PublicMatchDetailPage() {
  const navigate = useNavigate()
  const { idOrSlug } = useParams<{ idOrSlug: string }>()
  const { data: season, isLoading: seasonLoading } = useActiveSeason()

  const paramType = idOrSlug ? getRouteParamType(idOrSlug) : 'id'

  const { data: matchById,   isLoading: loadingById   } = useMatch(paramType === 'id' ? idOrSlug : undefined)
  const { data: matchBySlug, isLoading: loadingBySlug } = useMatchBySlug(
    paramType === 'slug' ? idOrSlug : undefined, season?.id
  )

  const match      = paramType === 'id' ? matchById : matchBySlug
  const isLoading  = paramType === 'id' ? loadingById : loadingBySlug
  const id         = match?.id

  const [activeTab, setActiveTab] = useState<LiveTab>('resume')

  // ── Realtime ────────────────────────────────────────────────────────────
  useRealtimeMatch(id)

  const eventLoopEnabled = (match as any)?.events_enabled ?? false
  const fetchedOnceRef   = useRef(false)

  const pollEvents = useCallback(async () => {
    if (!id || fetchedOnceRef.current || !eventLoopEnabled) return
    try {
      const { data } = await (window as any)?.supabase
        ?.from('match_events')?.select('*')?.eq('match_id', id)?.order('created_at', { ascending: true })
      if ((data ?? []).length === 0) fetchedOnceRef.current = true
    } catch { fetchedOnceRef.current = true }
  }, [id, eventLoopEnabled])

  useEffect(() => {
    void pollEvents()
    if (!eventLoopEnabled) return
    return () => clearInterval(1000)
  }, [pollEvents, eventLoopEnabled])

  const { data: liveEvents = [] } = useMatchEvents(id)

  // ── Chrono live ─────────────────────────────────────────────────────────
  const clock = useLiveClock(
    match?.live_started_at ?? null,
    (match as any)?.live_period as 1 | 2 | null ?? null,
    (match?.status as any) ?? 'scheduled',
    (match as any)?.halftime_at,
    match?.is_paused ?? false,
    match?.paused_at ?? null,
    match?.total_paused_seconds ?? 0,
  )

  // ── Vidéo WebRTC ────────────────────────────────────────────────────────
  const { stream: liveStream, isLive: isStreamingLive, viewerCount } = useWebRTCViewer(id ?? '')

  // ── Derived ─────────────────────────────────────────────────────────────
  const home = match?.home_team as TeamRef | undefined
  const away = match?.away_team as TeamRef | undefined
  const goals = useMemo(() => (match?.goals ?? []) as any[], [match])

  const isLive       = match?.status === 'live'
  const isCompleted  = match?.status === 'completed'

  const sortedGoals   = useMemo(() => [...(goals ?? [])].sort((a: any, b: any) => (a.minute ?? 0) - (b.minute ?? 0)), [goals])
  const homeScorers   = useMemo(() => sortedGoals.filter((g: any) => g.team_id === home?.id), [sortedGoals, home])
  const awayScorers   = useMemo(() => sortedGoals.filter((g: any) => g.team_id === away?.id), [sortedGoals, away])

  const hasLiveVideoTab  = isLive && isStreamingLive && !match?.video_url
  const hasEmbedVideoTab = !!match?.video_url && (isLive || isCompleted)
  const videoTabLabel    = match?.video_url
    ? match.status === 'completed' ? 'Vidéo' : 'Vidéo'
    : 'Live'

  const tabList: LiveTab[] = ['resume', 'events']
  if (hasLiveVideoTab)  tabList.unshift('live-video')
  if (hasEmbedVideoTab) tabList.push('live-video')
  tabList.push('info')

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
        <div className="flex flex-col items-center justify-center gap-5 py-32">
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Match introuvable</p>
          <Link to="/public/matches"
            className="px-5 py-2.5 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-bold
                       hover:bg-white/[0.1] transition-colors border border-white/[0.08]">
            Retour aux matchs
          </Link>
        </div>
      </PublicLayout>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto pt-3 pb-24 px-2 space-y-4">

        {/* Back link */}
        <div className="px-1">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold
                       text-slate-500 hover:text-slate-300 uppercase tracking-wider transition-colors"
          >
            <ArrowLeft size={12} />
            Retour aux matchs
          </button>
        </div>

        {/* ─── MATCH HERO ─── */}
        <MatchHero
          match={match}
          home={home}
          away={away}
          goals={goals}
          isLive={isLive}
          isCompleted={isCompleted}
          clock={clock}
          sortedGoals={sortedGoals}
          homeScorers={homeScorers}
          awayScorers={awayScorers}
        />

        {/* ─── TABS ─── */}
        <TabBar tabs={tabList} activeTab={activeTab} onChange={setActiveTab} />

        {/* ─── TAB CONTENT ─── */}
        <div className="px-2">
          <AnimatePresence mode="wait">

            {/* RÉSUMÉ */}
            {activeTab === 'resume' && (
              <motion.div key="resume" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="space-y-3 pt-1">
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
                  <div className="card p-8 text-center">
                    <Zap size={24} className="mx-auto mb-3 text-slate-700" />
                    <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em]">Aucun événement</p>
                    <p className="text-[10px] text-slate-600 mt-1.5">Les événements apparaîtront ici en direct</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* LIVE VIDEO — WebRTC */}
            {activeTab === 'live-video' && isLive && isStreamingLive && !match?.video_url && (
              <motion.div key="live-video" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="space-y-3 pt-1">
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-red-500/[0.07] border border-red-500/[0.18]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <span className="text-[9px] font-black text-red-400 uppercase tracking-[0.25em]">Diffusion en direct</span>
                  <span className="ml-auto text-[9px] text-slate-500 font-bold uppercase">
                    {viewerCount ?? 0} viewer{(viewerCount ?? 0) > 1 ? 's' : ''}
                  </span>
                </div>

                <LiveVideoPlayer
                  matchId={match.id}
                  stream={liveStream}
                  isLive
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

            {/* LIVE VIDEO — Embed YouTube/Twitch */}
            {activeTab === 'live-video' && match?.video_url && (isLive || isCompleted) && (
              <motion.div key="video-embed" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="pt-1 space-y-3">
                <CardSection label="Vidéo du match" icon={Video}>
                  <VideoEmbed url={match.video_url} title={`Vidéo du match ${home.name} vs ${away.name}`} />
                </CardSection>
                <InfoSection match={match} season={season} />
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
    </PublicLayout>
  )
}

// Export alias
export { PublicMatchDetailPage as default }
