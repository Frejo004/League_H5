/**
 * Hooks Supabase Realtime
 * + Notifications push locales pour les événements clés
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Match, MatchLineupRow, MatchWithTeams, Team } from '@/types/database'

type RealtimeMatchPayload = Pick<Match, 'id' | 'season_id' | 'status' | 'home_score' | 'away_score'>
type RealtimeTeamPayload = Pick<Team, 'season_id'>
type RealtimeLineupPayload = Pick<MatchLineupRow, 'team_id'>
type TeamNameRef = Pick<Team, 'name'>
type MatchTeamNames = {
  home_team: TeamNameRef | TeamNameRef[] | null
  away_team: TeamNameRef | TeamNameRef[] | null
}

function getRealtimeRow<T>(row: unknown): Partial<T> {
  return row && typeof row === 'object' ? row as Partial<T> : {}
}

function getTeamName(team: TeamNameRef | TeamNameRef[] | null | undefined, fallback: string) {
  const value = Array.isArray(team) ? team[0] : team
  return value?.name ?? fallback
}

/**
 * Helper : envoyer une notification via le Service Worker actif (iOS PWA + desktop)
 * - Si l'app est au premier plan → ne fait rien (le badge UI suffit)
 * - Si l'app est en arrière-plan → notification système
 */
export async function pushLocal(title: string, body: string, tag?: string, url?: string) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  if (document.visibilityState === 'visible') return

  try {
    // Utilise le SW déjà enregistré par VitePWA (évite les conflits de scope)
    const reg = await navigator.serviceWorker.ready
    if (reg?.active) {
      reg.active.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        body,
        tag: tag ?? 'league-h5',
        url: url ?? '/',
        icon: '/logo-h5.png',
      })
      return
    }
  } catch { /* no SW */ }

  // Fallback : Notification API directe (desktop sans SW)
  const n = new Notification(title, { body, icon: '/logo-h5.png', badge: '/logo-h5.png', tag })
  if (url) n.onclick = () => { window.focus(); window.location.href = url; n.close() }
}

// ── Realtime pour le détail d'un match ───────────────────────────────────────
// Utilisé dans MatchDetailPage — met à jour le score, les buts et les passes
// en temps réel sans recharger la page.

export function useRealtimeMatch(matchId?: string) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!matchId) return

    const channelName = `match-detail-${matchId}`
    const channel = supabase.channel(channelName)

    channel
      // 1. Match core updates
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'matches', 
        filter: `id=eq.${matchId}` 
      }, async (payload) => {
        console.log('🔄 Realtime: Match update', payload)
        qc.invalidateQueries({ queryKey: ['matches'] })
        
        const newMatch = payload.new as { status?: string; home_score?: number; away_score?: number }
        const oldMatch = payload.old as { status?: string }
        if (newMatch.status === 'completed' && oldMatch.status !== 'completed') {
          const { data: m } = await supabase
            .from('matches')
            .select('home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)')
            .eq('id', matchId).single()
          const home = (m as unknown as MatchWithTeams)?.home_team?.name ?? '?'
          const away = (m as unknown as MatchWithTeams)?.away_team?.name ?? '?'
          pushLocal(
            '🏁 Match terminé',
            `${home} ${newMatch.home_score ?? 0} – ${newMatch.away_score ?? 0} ${away}`,
            `match-end-${matchId}`,
            `/matches/${matchId}`
          )
        }
      })
      // 2. Goals
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'goals', 
        filter: `match_id=eq.${matchId}` 
      }, () => {
        qc.invalidateQueries({ queryKey: ['matches', 'detail', matchId] })
        qc.invalidateQueries({ queryKey: ['match-events', matchId] })
        qc.invalidateQueries({ queryKey: ['scorers'] })
      })
      // 3. Events
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'match_events', 
        filter: `match_id=eq.${matchId}` 
      }, () => {
        qc.invalidateQueries({ queryKey: ['matches', 'detail', matchId] })
        qc.invalidateQueries({ queryKey: ['match-events', matchId] })
      })
      // 4. Assists
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'assists', 
        filter: `match_id=eq.${matchId}` 
      }, () => qc.invalidateQueries({ queryKey: ['matches', 'detail', matchId] }))
      // 5. MVP Votes
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'mvp_votes', 
        filter: `match_id=eq.${matchId}` 
      }, () => qc.invalidateQueries({ queryKey: ['mvp_votes', matchId] }))
      .subscribe((status) => {
        if (status !== 'CLOSED') {
          console.log(`📡 Realtime (${matchId}):`, status)
        }
      })

    return () => { 
      supabase.removeChannel(channel) 
    }
  }, [matchId, qc])
}
// ── Realtime pour la liste des matchs d'une saison ───────────────────────────
// Utilisé globalement dans Header (via LiveTicker) — met à jour les scores
// et le classement en temps réel.

export function useRealtimeMatches(seasonId?: string) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!seasonId) return

    const channelName = `matches-season-${seasonId}`
    const channel = supabase.channel(channelName)
    
    channel
      // 1. Match updates (scores, status, etc.)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'matches' 
      }, async (payload) => {
        const newPayload = getRealtimeRow<RealtimeMatchPayload>(payload.new)
        const oldPayload = getRealtimeRow<RealtimeMatchPayload>(payload.old)
        const matchSeasonId = newPayload.season_id ?? oldPayload.season_id
        if (matchSeasonId !== seasonId) return

        console.log('🔄 Realtime: Match update for season', seasonId)
        qc.invalidateQueries({ queryKey: ['matches', seasonId] })
        qc.invalidateQueries({ queryKey: ['standings', seasonId] })
        qc.invalidateQueries({ queryKey: ['scorers', seasonId] })
        qc.invalidateQueries({ queryKey: ['landing-stats'] })

        const newMatch = newPayload
        const oldMatch = oldPayload
        
        if (newMatch.id && newMatch.status === 'live' && oldMatch.status !== 'live') {
          const { data: match } = await supabase
            .from('matches')
            .select('home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)')
            .eq('id', newMatch.id)
            .single()
          
          const matchTeams = match as unknown as MatchTeamNames | null
          const home = getTeamName(matchTeams?.home_team, 'Équipe A')
          const away = getTeamName(matchTeams?.away_team, 'Équipe B')
          
          pushLocal(
            '🔴 Match en direct !',
            `${home} vs ${away} vient de commencer`,
            `live-${newMatch.id}`,
            `/matches/${newMatch.id}`
          )
        }
      })
      // 2. Goal updates
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'goals' 
      }, () => {
        qc.invalidateQueries({ queryKey: ['matches', seasonId] })
        qc.invalidateQueries({ queryKey: ['scorers', seasonId] })
        qc.invalidateQueries({ queryKey: ['standings', seasonId] })
      })
      .subscribe((status) => {
        if (status !== 'CLOSED') {
          console.log(`📡 Realtime (${channelName}):`, status)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [seasonId, qc])
}

// ── Realtime pour les équipes d'une saison ───────────────────────────────────
// Utilisé dans les pages qui affichent des équipes — met à jour le nom, logo, etc.
// en temps réel quand un admin modifie une équipe.

export function useRealtimeTeams(seasonId?: string) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!seasonId) return

    const channelName = `teams-season-${seasonId}`
    const channel = supabase.channel(channelName)

    channel
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'teams' 
      }, (payload) => {
        const newPayload = getRealtimeRow<RealtimeTeamPayload>(payload.new)
        const oldPayload = getRealtimeRow<RealtimeTeamPayload>(payload.old)
        const teamSeasonId = newPayload.season_id ?? oldPayload.season_id
        if (teamSeasonId !== seasonId) return

        console.log('🛡️ Realtime: Team update received')
        qc.invalidateQueries({ queryKey: ['teams', seasonId] })
        qc.invalidateQueries({ queryKey: ['matches', seasonId] })
        qc.invalidateQueries({ queryKey: ['standings', seasonId] })
        qc.invalidateQueries({ queryKey: ['scorers', seasonId] })
      })
      .subscribe((status) => {
        if (status !== 'CLOSED') {
          console.log(`📡 Realtime (${channelName}):`, status)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [seasonId, qc])
}

// ── Realtime pour la tactique d'une équipe ────────────────────────────────────

export function useRealtimeTactics(teamId?: string, matchId?: string) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!teamId || !matchId) return

    const channelName = `tactics-team-${teamId}-${matchId}`
    const channel = supabase.channel(channelName)
    
    channel
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'match_lineups', 
        filter: `match_id=eq.${matchId}` 
      }, async (payload) => {
        const item = payload.new && Object.keys(payload.new).length > 0
          ? getRealtimeRow<RealtimeLineupPayload>(payload.new)
          : getRealtimeRow<RealtimeLineupPayload>(payload.old)
        if (item.team_id !== teamId) return

        console.log('📋 Realtime: Tactical update')
        qc.invalidateQueries({ queryKey: ['match_lineups', matchId] })
      })
      .subscribe((status) => {
        if (status !== 'CLOSED') {
          console.log(`📡 Realtime (${channelName}):`, status)
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [teamId, matchId, qc])
}

export function useRealtimeMatchTactics(matchId?: string) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!matchId) return

    const channelName = `tactics-match-${matchId}`
    const channel = supabase.channel(channelName)
    
    channel
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'match_lineups', 
        filter: `match_id=eq.${matchId}` 
      }, () => {
        console.log('📋 Realtime: DB Tactical update')
        qc.invalidateQueries({ queryKey: ['match_lineups', matchId] })
      })
      .on('broadcast', { event: 'tactical_update' }, () => {
        console.log('📋 Realtime: Broadcast Tactical update')
        qc.invalidateQueries({ queryKey: ['match_lineups', matchId] })
      })
      .subscribe((status) => {
        if (status !== 'CLOSED') {
          console.log(`📡 Realtime (${channelName}):`, status)
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [matchId, qc])
}
