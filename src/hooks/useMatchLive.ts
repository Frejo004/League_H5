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
}

export function useLiveClock(
  liveStartedAt: string | null,
  livePeriod: 1 | 2 | null,
  status: string,
  halftimeAt?: string | null,
): LiveClockState {
  const [state, setState] = useState<LiveClockState>({
    minute: 0, seconds: 0, phase: 1, label: "0'00\"", shortLabel: "0'", progress: 0, breakSecondsLeft: null, totalElapsedSeconds: null,
  })

  useEffect(() => {
    if (status !== 'live' || !liveStartedAt) {
      if (status === 'completed') {
        setState({ minute: 20, seconds: 0, phase: 4, label: 'Terminé', shortLabel: 'FT', progress: 100, breakSecondsLeft: null, totalElapsedSeconds: null })
      }
      return
    }

    const tick = () => {
      const now = Date.now()

      // ── Phase 2 : Pause mi-temps (on a halftimeAt mais pas encore livePeriod 2) ──
      if (halftimeAt && livePeriod === 1) {
        const startTime = new Date(halftimeAt).getTime()
        if (isNaN(startTime)) return // Sécurité : date invalide

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
        })
        return
      }

      const liveTime = new Date(liveStartedAt).getTime()
      if (isNaN(liveTime)) return // Sécurité

      const elapsedSec = (now - liveTime) / 1000

      let phase: 1 | 2 | 3 | 4
      let minute: number
      let seconds: number
      let label: string
      let shortLabel: string
      let progress: number
      let cappedSec: number

      if (livePeriod === 1) {
        // 1ère mi-temps : 0-20 min
        cappedSec = Math.min(elapsedSec, HALF_DURATION * 60)
        minute = Math.floor(cappedSec / 60)
        seconds = Math.floor(cappedSec % 60)
        phase = 1
        label = `${minute}'${String(seconds).padStart(2, '0')}"`
        shortLabel = `${minute}'`
        progress = (cappedSec / 60 / TOTAL_DURATION) * 100
      } else {
        // 2ème mi-temps
        cappedSec = Math.min(elapsedSec, HALF_DURATION * 60)
        minute = Math.floor(cappedSec / 60)
        seconds = Math.floor(cappedSec % 60)
        phase = 3
        label = `${minute}'${String(seconds).padStart(2, '0')}"`
        shortLabel = `${minute}'`
        progress = ((HALF_DURATION + BREAK_DURATION + cappedSec / 60) / TOTAL_DURATION) * 100
      }

      setState({ 
        minute, 
        seconds, 
        phase, 
        label, 
        shortLabel, 
        progress: Math.min(progress, 100), 
        breakSecondsLeft: null,
        totalElapsedSeconds: cappedSec
      })
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [liveStartedAt, livePeriod, halftimeAt, status])

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

  // Signaler la mi-temps (stocker halftime_at, déclencher le décompte 5min)
  const signalHalftime = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString()
      // 1. Stocker halftime_at
      await supabase.from('matches').update({
        halftime_at: now,
      }).eq('id', matchId!)

      // 2. Insérer l'événement 'halftime' (pour qu'il apparaisse dans le flux)
      // On le met à 20' par défaut car c'est la fin théorique
      const { data: user } = await supabase.auth.getUser()
      if (user.user) {
        await supabase.from('match_events').insert({
          match_id: matchId!,
          type: 'halftime',
          minute: HALF_DURATION,
          period: 1,
          created_by: user.user.id
        })
      }
    },
    onSuccess: invalidate,
  })

  // Passer à la 2ème mi-temps (après le décompte)
  const startSecondHalf = useMutation({
    mutationFn: async () => {
      // On ne rappelle plus match_halftime RPC ici car on a déjà géré l'événement dans signalHalftime
      // On met juste à jour le début de la 2ème MT
      await supabase.from('matches').update({
        live_started_at: new Date().toISOString(),
        live_period: 2,
        halftime_at: null,
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
      type: MatchEventType
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

      // Si c'est un but, mettre à jour le score et la table 'goals'
      if ((event.type === 'goal' || event.type === 'own_goal') && event.team_id) {
        // 1. Récupérer le match actuel pour le score
        const { data: match } = await supabase
          .from('matches')
          .select('id, home_team_id, away_team_id, home_score, away_score')
          .eq('id', matchId!)
          .single()

        if (match) {
          const isHome = event.type === 'own_goal'
            ? event.team_id !== match.home_team_id  // CSC : point pour l'adversaire
            : event.team_id === match.home_team_id

          // 2. Mettre à jour le score global
          await supabase.from('matches').update({
            home_score: isHome ? (match.home_score ?? 0) + 1 : (match.home_score ?? 0),
            away_score: !isHome ? (match.away_score ?? 0) + 1 : (match.away_score ?? 0),
          }).eq('id', matchId!)

          // 3. Insérer dans la table 'goals' pour la liste des buteurs (header)
          if (event.player_id) {
            const { data: newGoal, error: goalErr } = await supabase.from('goals').insert({
              match_id: matchId!,
              team_id: event.team_id,
              player_id: event.player_id,
              minute: event.minute ?? 0,
              is_own_goal: event.type === 'own_goal'
            }).select().single()

            // 4. Si passeur, insérer dans 'assists'
            if (!goalErr && newGoal && event.player2_id) {
              await supabase.from('assists').insert({
                match_id: matchId!,
                goal_id: newGoal.id,
                player_id: event.player2_id
              })
            }
          }
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

  return { startLive, signalHalftime, startSecondHalf, endMatch, addEvent, deleteEvent }
}
