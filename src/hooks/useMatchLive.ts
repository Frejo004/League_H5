/**
 * useMatchLive — Données live d'un match en cours
 *
 * - Événements en temps réel (buts, cartons, commentaires…)
 * - Chronomètre calculé côté client à partir de live_started_at
 * - Réactions spectateurs
 * - Durées : 1ère mi-temps 20min, repos 5min, 2ème mi-temps 20min
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MatchEvent, LiveReaction } from '@/types/database'

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
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${name}`)
    if (existing) supabase.removeChannel(existing)

    const ch = supabase.channel(name)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'match_events',
        filter: `match_id=eq.${matchId}`,
      }, () => qc.invalidateQueries({ queryKey: ['match-events', matchId] }))
      .subscribe()

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
  /** Période : 1 = 1ère MT, 2 = pause, 3 = 2ème MT, 4 = terminé */
  phase: 1 | 2 | 3 | 4
  /** Secondes dans la minute courante */
  seconds: number
  /** Texte affiché : "12'", "Mi-temps", "Terminé" */
  label: string
  /** Progression globale 0-100 */
  progress: number
}

export function useLiveClock(
  liveStartedAt: string | null,
  livePeriod: 1 | 2 | null,
  status: string,
): LiveClockState {
  const [state, setState] = useState<LiveClockState>({
    minute: 0, phase: 1, seconds: 0, label: '0\'', progress: 0,
  })

  useEffect(() => {
    if (status !== 'live' || !liveStartedAt) {
      if (status === 'completed') {
        setState({ minute: 20, phase: 4, seconds: 0, label: 'Terminé', progress: 100 })
      }
      return
    }

    const tick = () => {
      const elapsed = (Date.now() - new Date(liveStartedAt).getTime()) / 1000 / 60 // en minutes

      let phase: 1 | 2 | 3 | 4
      let minute: number
      let seconds: number
      let label: string
      let progress: number

      if (livePeriod === 1) {
        // 1ère mi-temps : 0-20 min
        const capped = Math.min(elapsed, HALF_DURATION)
        minute = Math.floor(capped)
        seconds = Math.floor((capped - minute) * 60)
        phase = 1
        label = `${minute}'`
        progress = (capped / TOTAL_DURATION) * 100
      } else {
        // 2ème mi-temps : on repart de 0 depuis le moment où la 2ème MT a commencé
        // live_started_at est mis à jour au coup d'envoi de la 2ème MT
        const capped = Math.min(elapsed, HALF_DURATION)
        minute = Math.floor(capped)
        seconds = Math.floor((capped - minute) * 60)
        phase = 3
        label = `${minute}'`
        progress = ((HALF_DURATION + BREAK_DURATION + capped) / TOTAL_DURATION) * 100
      }

      setState({ minute, phase, seconds, label, progress: Math.min(progress, 100) })
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [liveStartedAt, livePeriod, status])

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
  }, [qc, matchId])

  // Démarrer le live
  const startLive = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('start_match_live', { p_match_id: matchId! })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  // Passer à la 2ème mi-temps
  const startSecondHalf = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('match_halftime', { p_match_id: matchId! })
      if (error) throw error
      // Mettre à jour live_started_at pour le chrono de la 2ème MT
      await supabase.from('matches').update({
        live_started_at: new Date().toISOString(),
        live_period: 2,
      }).eq('id', matchId!)
    },
    onSuccess: invalidate,
  })

  // Terminer le match
  const endMatch = useMutation({
    mutationFn: async ({ homeScore, awayScore }: { homeScore: number; awayScore: number }) => {
      const { error } = await supabase.rpc('end_match_live', {
        p_match_id: matchId!,
        p_home_score: homeScore,
        p_away_score: awayScore,
      })
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['standings'] })
      qc.invalidateQueries({ queryKey: ['scorers'] })
    },
  })

  // Ajouter un événement (but, carton, commentaire…)
  const addEvent = useMutation({
    mutationFn: async (event: {
      type: string
      minute?: number | null
      period?: 1 | 2
      team_id?: string | null
      player_id?: string | null
      player2_id?: string | null
      description?: string | null
      created_by: string
    }) => {
      const { error } = await supabase.from('match_events').insert({
        match_id: matchId!, ...event,
      })
      if (error) throw error

      // Si c'est un but, mettre à jour le score en temps réel
      if (event.type === 'goal' || event.type === 'own_goal') {
        const { data: match } = await supabase
          .from('matches')
          .select('home_team_id, away_team_id, home_score, away_score')
          .eq('id', matchId!)
          .single()

        if (match && event.team_id) {
          const isHome = event.type === 'own_goal'
            ? event.team_id !== match.home_team_id  // CSC : point pour l'adversaire
            : event.team_id === match.home_team_id

          await supabase.from('matches').update({
            home_score: isHome
              ? (match.home_score ?? 0) + 1
              : (match.home_score ?? 0),
            away_score: !isHome
              ? (match.away_score ?? 0) + 1
              : (match.away_score ?? 0),
          }).eq('id', matchId!)
        }
      }
    },
    onSuccess: invalidate,
  })

  // Supprimer un événement
  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase.from('match_events').delete().eq('id', eventId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { startLive, startSecondHalf, endMatch, addEvent, deleteEvent }
}
