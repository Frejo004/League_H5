/**
 * useMatchLive — Données live d'un match en cours
 *
 * - Événements en temps réel (buts, cartons, commentaires…)
 * - Chronomètre calculé côté client à partir de live_started_at
 * - Réactions spectateurs
 * - Durées : 1ère mi-temps 20min, repos 5min, 2ème mi-temps 20min
 */

import { useEffect, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MatchEvent, LiveReaction, MatchEventType } from '@/types/database'

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de durée (en minutes)
// ─────────────────────────────────────────────────────────────────────────────

export const HALF_DURATION   = 20  // durée d'une mi-temps
export const BREAK_DURATION  = 5   // durée de la pause
export const TOTAL_DURATION  = HALF_DURATION * 2 + BREAK_DURATION  // 45 min

// ─────────────────────────────────────────────────────────────────────────────
// useMatchEvents — flux d'événements d'un match
// ─────────────────────────────────────────────────────────────────────────────

export function useMatchEvents(matchId?: string) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['match-events', matchId],
    enabled: !!matchId,
    queryFn: async (): Promise<MatchEvent[]> => {
      const { data, error } = await supabase
        .from('match_events')
        .select(`
          *,
          team:teams!match_events_team_id_fkey(id, name, color),
          player:players!match_events_player_id_fkey(id, first_name, last_name),
          player2:players!match_events_player2_id_fkey(id, first_name, last_name)
        `)
        .eq('match_id', matchId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as MatchEvent[]
    },
    staleTime: 0,
  })

  // Realtime
  useEffect(() => {
    if (!matchId) return
    const name = `match-events-${matchId}`
    const ch = supabase.channel(name)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'match_events',
        filter: `match_id=eq.${matchId}`,
      }, () => qc.invalidateQueries({ queryKey: ['match-events', matchId] }))
      .subscribe((status) => {
        if (status !== 'CLOSED') {
          console.log(`📡 Realtime (${name}):`, status)
        }
      })

    return () => { supabase.removeChannel(ch) }
  }, [matchId, qc])

  return query
}

// ─────────────────────────────────────────────────────────────────────────────
// useLiveReactions — réactions spectateurs en temps réel
// ─────────────────────────────────────────────────────────────────────────────

export function useLiveReactions(matchId?: string) {
  const qc = useQueryClient()
  const [burst, setBurst] = useState<{ emoji: string; id: string }[]>([])

  const query = useQuery({
    queryKey: ['live-reactions', matchId],
    enabled: !!matchId,
    queryFn: async () => {
      // Compter les réactions des 30 dernières secondes par emoji
      const since = new Date(Date.now() - 30_000).toISOString()
      const { data } = await supabase
        .from('live_reactions')
        .select('emoji')
        .eq('match_id', matchId!)
        .gte('created_at', since)
      const counts: Record<string, number> = {}
      for (const r of data ?? []) {
        counts[r.emoji] = (counts[r.emoji] ?? 0) + 1
      }
      return counts
    },
    staleTime: 0,
    refetchInterval: 5_000,
  })

  // Realtime pour les bursts visuels
  useEffect(() => {
    if (!matchId) return
    const name = `live-reactions-${matchId}`
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${name}`)
    if (existing) supabase.removeChannel(existing)

    const ch = supabase.channel(name)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'live_reactions',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        const r = payload.new as LiveReaction
        // Ajouter au burst visuel
        const id = `${Date.now()}-${Math.random()}`
        setBurst(prev => [...prev.slice(-20), { emoji: r.emoji, id }])
        // Supprimer après l'animation
        setTimeout(() => setBurst(prev => prev.filter(b => b.id !== id)), 3000)
        qc.invalidateQueries({ queryKey: ['live-reactions', matchId] })
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [matchId, qc])

  const sendReaction = useMutation({
    mutationFn: async ({ emoji, userId }: { emoji: string; userId: string }) => {
      const { error } = await supabase.from('live_reactions').insert({
        match_id: matchId!, user_id: userId, emoji,
      })
      if (error) throw error
    },
  })

  return { counts: query.data ?? {}, burst, sendReaction }
}

// ─────────────────────────────────────────────────────────────────────────────
// useLiveClock — chronomètre calculé côté client
// Durée : 20min (1ère MT) + 5min pause + 20min (2ème MT) = 45min
// ─────────────────────────────────────────────────────────────────────────────

export interface LiveClockState {
  /** Minute affichée (0-20 par mi-temps) */
  minute: number
  /** Secondes dans la minute courante (0-59) */
  seconds: number
  /** Période : 1 = 1ère MT, 2 = pause/mi-temps, 3 = 2ème MT, 4 = terminé */
  phase: 1 | 2 | 3 | 4
  /** Texte affiché : "12'34\"", "Mi-temps 4:32", "Terminé" */
  label: string
  /** Texte court pour le badge */
  shortLabel: string
  /** Progression globale 0-100 */
  progress: number
  /** Secondes restantes dans la pause (null si pas en pause) */
  breakSecondsLeft: number | null
  totalElapsedSeconds: number | null
  isPaused: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Synchronisation de l'horloge avec le serveur Supabase (NTP-like)
// Évite les sauts de chronomètre lors des pauses/reprises dus à un décalage d'horloge locale
// ─────────────────────────────────────────────────────────────────────────────

let serverClockOffset: number | null = null
let isFetchingOffset = false

async function syncServerClock() {
  if (serverClockOffset !== null || isFetchingOffset) return
  isFetchingOffset = true
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) return
    
    const start = Date.now()
    // Requête sur une table publique (matches) avec limit=1 pour obtenir un statut 200 OK propre et autorisé
    const res = await fetch(`${supabaseUrl}/rest/v1/matches?limit=1`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    const serverDate = res.headers.get('date')
    if (serverDate) {
      const serverTime = new Date(serverDate).getTime()
      const lat = (Date.now() - start) / 2
      serverClockOffset = (start + lat) - serverTime
      console.log('⏰ [ClockSync] Horloge synchronisée avec le serveur. Décalage:', serverClockOffset, 'ms (latence réseau:', lat, 'ms)')
    }
  } catch (err) {
    console.warn('⚠️ [ClockSync] Échec de la synchronisation de l\'horloge:', err)
  } finally {
    isFetchingOffset = false
  }
}

export function useLiveClock(
  liveStartedAt: string | null,
  livePeriod: 1 | 2 | null,
  status: string,
  halftimeAt?: string | null,
  isPaused: boolean = false,
  pausedAt: string | null = null,
  totalPausedSeconds: number = 0,
): LiveClockState {
  const [state, setState] = useState<LiveClockState>({
    minute: 0, seconds: 0, phase: 1, label: "0'00\"", shortLabel: "0'", progress: 0, breakSecondsLeft: null, totalElapsedSeconds: null, isPaused: false
  })

  useEffect(() => {
    // Lancer la synchronisation dès le montage de l'horloge
    syncServerClock()

    if (status !== 'live' || !liveStartedAt) {
      if (status === 'completed') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({ minute: 20, seconds: 0, phase: 4, label: 'Terminé', shortLabel: 'FT', progress: 100, breakSecondsLeft: null, totalElapsedSeconds: null, isPaused: false })
      }
      return
    }

    const tick = () => {
      const now = Date.now() - (serverClockOffset || 0)

      // ── Phase 2 : Pause mi-temps (on a halftimeAt mais pas encore livePeriod 2) ──
      if (halftimeAt && livePeriod === 1) {
        const startTime = new Date(halftimeAt).getTime()
        if (isNaN(startTime)) return

        const breakElapsedSec = (now - startTime) / 1000
        const breakTotalSec = BREAK_DURATION * 60
        const breakLeft = Math.max(0, breakTotalSec - breakElapsedSec)
        const bMin = Math.floor(breakLeft / 60)
        const bSec = Math.floor(breakLeft % 60)
        setState({
          minute: HALF_DURATION,
          seconds: 0,
          phase: 2,
          label: `Mi-temps ${bMin}:${String(bSec).padStart(2, '0')}`,
          shortLabel: `Pause ${bMin}:${String(bSec).padStart(2, '0')}`,
          progress: (HALF_DURATION / TOTAL_DURATION) * 100,
          breakSecondsLeft: Math.ceil(breakLeft),
          totalElapsedSeconds: HALF_DURATION * 60,
          isPaused: false
        })
        return
      }

      const liveTime = new Date(liveStartedAt).getTime()
      if (isNaN(liveTime)) return

      // Temps écoulé brut en secondes
      let elapsedSec = (now - liveTime) / 1000

      // Ajuster pour la pause en cours
      if (isPaused && pausedAt) {
        const pausedNow = (now - new Date(pausedAt).getTime()) / 1000
        elapsedSec -= pausedNow
      }

      // Déduire le cumul des pauses passées
      elapsedSec -= (totalPausedSeconds || 0)
      
      // Sécurité : pas de temps négatif
      elapsedSec = Math.max(0, elapsedSec)

      let phase: 1 | 2 | 3 | 4
      let minute: number
      let seconds: number
      let label: string
      let shortLabel: string
      let progress: number
      let cappedSec: number

      if (livePeriod === 1) {
        cappedSec = Math.min(elapsedSec, HALF_DURATION * 60)
        minute = Math.floor(cappedSec / 60)
        seconds = Math.floor(cappedSec % 60)
        phase = 1
        label = `${minute}'${String(seconds).padStart(2, '0')}"`
        shortLabel = `${minute}'`
        progress = (cappedSec / 60 / TOTAL_DURATION) * 100
      } else {
        cappedSec = Math.min(elapsedSec, HALF_DURATION * 60)
        const currentHalfMinute = Math.floor(cappedSec / 60)
        minute = HALF_DURATION + currentHalfMinute
        seconds = Math.floor(cappedSec % 60)
        phase = 3
        label = `${minute}'${String(seconds).padStart(2, '0')}"`
        shortLabel = `${minute}'`
        progress = ((HALF_DURATION + BREAK_DURATION + currentHalfMinute) / TOTAL_DURATION) * 100
      }

      setState({ 
        minute, 
        seconds, 
        phase, 
        label, 
        shortLabel, 
        progress: Math.min(progress, 100), 
        breakSecondsLeft: null,
        totalElapsedSeconds: cappedSec,
        isPaused
      })
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [liveStartedAt, livePeriod, halftimeAt, status, isPaused, pausedAt, totalPausedSeconds])

  return state
}

// ─────────────────────────────────────────────────────────────────────────────
// useAdminMatchLive — contrôles admin pour piloter le live
// ─────────────────────────────────────────────────────────────────────────────

export function useAdminMatchLive(matchId?: string) {
  const qc = useQueryClient()

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['matches', 'detail', matchId] })
    qc.invalidateQueries({ queryKey: ['match-events', matchId] })
    qc.invalidateQueries({ queryKey: ['matches'] })
    qc.invalidateQueries({ queryKey: ['standings'] })
    qc.invalidateQueries({ queryKey: ['scorers'] })
  }, [qc, matchId])

  const startLive = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('start_match_live', { p_match_id: matchId! });
      if (error) {
        console.error('[useAdminMatchLive] Erreur au démarrage du match en direct:', error);
        throw error;
      }
    },
    onSuccess: invalidate,
  })

  const signalHalftime = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('match_halftime', { p_match_id: matchId! });
      if (error) {
        console.error('[useAdminMatchLive] Erreur lors du signalement de la mi-temps:', error);
        throw error;
      }
    },
    onSuccess: invalidate,
  })

  const startSecondHalf = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('start_second_half' as any, { p_match_id: matchId! });
      if (error) {
        console.error('[useAdminMatchLive] Erreur au démarrage de la deuxième mi-temps:', error);
        throw error;
      }
    },
    onSuccess: invalidate,
  })

  const togglePause = useMutation({
    mutationFn: async (reason?: string) => {
      const { error } = await supabase.rpc('toggle_match_pause_v2', { 
        p_match_id: matchId!,
        p_reason: reason || undefined
      });
      if (error) {
        console.error('[useAdminMatchLive] Erreur lors de l\'activation/désactivation de la pause:', error);
        throw error;
      }
    },
    onSuccess: invalidate,
  })

  const endMatch = useMutation({
    mutationFn: async ({ homeScore, awayScore }: { homeScore: number; awayScore: number }) => {
      const { error } = await supabase.rpc('end_match_live', {
        p_match_id: matchId!,
        p_home_score: homeScore,
        p_away_score: awayScore,
      });
      if (error) {
        console.error('[useAdminMatchLive] Erreur lors de la fin du match:', error);
        throw error;
      }
    },
    onSuccess: invalidate,
  })

  const addEvent = useMutation({
    mutationFn: async (event: {
      type: MatchEventType
      minute: number
      period: 1 | 2
      team_id?: string | null
      player_id?: string | null
      player2_id?: string | null
      description?: string | null
    }) => {
      const { error } = await supabase.rpc('add_match_event_v2', {
        p_match_id: matchId!,
        p_type: event.type,
        p_minute: event.minute,
        p_period: event.period,
        p_team_id: event.team_id || undefined,
        p_player_id: event.player_id || undefined,
        p_player2_id: event.player2_id || undefined,
        p_description: event.description || undefined,
      });
      if (error) {
        console.error('[useAdminMatchLive] Erreur lors de l\'ajout d\'un événement de match:', error);
        throw error;
      }
    },
    onSuccess: invalidate,
  })

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.rpc('delete_match_event_v2', { p_event_id: eventId });
      if (error) {
        console.error('[useAdminMatchLive] Erreur lors de la suppression d\'un événement de match:', error);
        throw error;
      }
    },
    onSuccess: invalidate,
  })

  const updateReporters = useMutation({
    mutationFn: async ({ eventsReporterId, videoReporterId }: { eventsReporterId?: string | null; videoReporterId?: string | null }) => {
      const updates: any = {}
      if (eventsReporterId !== undefined) updates.events_reporter_id = eventsReporterId
      if (videoReporterId !== undefined) updates.video_reporter_id = videoReporterId
      
      const { error } = await supabase.from('matches').update(updates).eq('id', matchId!)
      if (error) {
        console.error('[useAdminMatchLive] Erreur lors de la mise à jour des rapporteurs:', error)
        throw error
      }
    },
    onSuccess: invalidate,
  })

  return { startLive, signalHalftime, startSecondHalf, togglePause, endMatch, addEvent, deleteEvent, updateReporters }
}
