/**
 * Hooks Supabase Realtime
 * + Notifications push locales pour les événements clés
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

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

    const channel = supabase
      .channel(`match-detail-${matchId}`)
      // 1. Écouter les changements sur le match lui-même (Chrono, Période, Statut)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
        async (payload) => {
          console.log('🔄 Realtime: Match update received', payload)
          qc.invalidateQueries({ queryKey: ['matches', 'detail', matchId] })
          
          const newMatch = payload.new as { status?: string; home_score?: number; away_score?: number }
          const oldMatch = payload.old as { status?: string }
          if (newMatch.status === 'completed' && oldMatch.status !== 'completed') {
            const { data: m } = await supabase
              .from('matches')
              .select('home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)')
              .eq('id', matchId).single()
            const home = (m as any)?.home_team?.name ?? '?'
            const away = (m as any)?.away_team?.name ?? '?'
            pushLocal(
              '🏁 Match terminé',
              `${home} ${newMatch.home_score ?? 0} – ${newMatch.away_score ?? 0} ${away}`,
              `match-end-${matchId}`,
              `/matches/${matchId}`
            )
          }
        }
      )
      // 2. Écouter les buts
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `match_id=eq.${matchId}` },
        (payload) => {
          console.log('⚽ Realtime: Goal update received', payload)
          qc.invalidateQueries({ queryKey: ['matches', 'detail', matchId] })
          qc.invalidateQueries({ queryKey: ['match-events', matchId] })
          qc.invalidateQueries({ queryKey: ['scorers'] }) // Pour mettre à jour les classements en arrière-plan
        }
      )
      // 3. Écouter les événements (C'est ICI que la période 2 est souvent déclenchée)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events', filter: `match_id=eq.${matchId}` },
        (payload) => {
          console.log('📝 Realtime: Event update received', payload)
          // CRITIQUE : Si on reçoit un événement, on rafraîchit TOUT le match car 
          // le changement de période (1ère -> 2ème MT) génère souvent un événement kickoff
          qc.invalidateQueries({ queryKey: ['matches', 'detail', matchId] })
          qc.invalidateQueries({ queryKey: ['match-events', matchId] })
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assists', filter: `match_id=eq.${matchId}` },
        () => qc.invalidateQueries({ queryKey: ['matches', 'detail', matchId] })
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mvp_votes', filter: `match_id=eq.${matchId}` },
        () => qc.invalidateQueries({ queryKey: ['mvp_votes', matchId] })
      )
      .subscribe((status) => {
        console.log(`📡 Realtime Status (${matchId}):`, status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [matchId, qc])
}
// ── Realtime pour la liste des matchs d'une saison ───────────────────────────
// Utilisé globalement dans Header (via LiveTicker) — met à jour les scores
// et le classement en temps réel.

export function useRealtimeMatches(seasonId?: string) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!seasonId) return

    const channelName = `matches-season-${seasonId}-${Math.random().toString(36).slice(2, 9)}`
    
    const channel = supabase
      .channel(channelName)
      // 1. Changements sur les matchs (scores, statut, etc.)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        async (payload) => {
          const matchSeasonId = (payload.new as any)?.season_id || (payload.old as any)?.season_id
          if (matchSeasonId !== seasonId) return

          console.log('🔄 Realtime: Match update for this season', payload)
          qc.invalidateQueries({ queryKey: ['matches', seasonId] })
          qc.invalidateQueries({ queryKey: ['standings', seasonId] })
          qc.invalidateQueries({ queryKey: ['scorers', seasonId] })
          qc.invalidateQueries({ queryKey: ['landing-stats'] })

          const newMatch = payload.new as { id: string; status?: string }
          const oldMatch = payload.old as { status?: string }
          
          if (newMatch.status === 'live' && oldMatch.status !== 'live') {
            const { data: match } = await supabase
              .from('matches')
              .select('home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)')
              .eq('id', newMatch.id)
              .single()
            
            const home = (match as any)?.home_team?.name ?? 'Équipe A'
            const away = (match as any)?.away_team?.name ?? 'Équipe B'
            
            pushLocal(
              '🔴 Match en direct !',
              `${home} vs ${away} vient de commencer`,
              `live-${newMatch.id}`,
              `/matches/${newMatch.id}`
            )
          }
        }
      )
      // 2. Changements sur les buts
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
        },
        () => {
          console.log('⚽ Realtime: Goal detected')
          qc.invalidateQueries({ queryKey: ['matches', seasonId] })
          qc.invalidateQueries({ queryKey: ['scorers', seasonId] })
          qc.invalidateQueries({ queryKey: ['standings', seasonId] })
        }
      )
      .subscribe((status) => {
        console.log(`📡 Realtime Status (${channelName}):`, status)
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

    const channel = supabase
      .channel(`teams-season-${seasonId}`)
      // Changement sur n'importe quelle équipe
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
        },
        (payload) => {
          const teamSeasonId = (payload.new as any)?.season_id || (payload.old as any)?.season_id
          if (teamSeasonId !== seasonId) return

          console.log('🛡️ Realtime: Team update for this season')
          // Invalider toutes les queries qui contiennent des données d'équipes
          qc.invalidateQueries({ queryKey: ['teams', seasonId] })
          qc.invalidateQueries({ queryKey: ['matches', seasonId] })
          qc.invalidateQueries({ queryKey: ['standings', seasonId] })
          qc.invalidateQueries({ queryKey: ['scorers', seasonId] })
        }
      )
      .subscribe()

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

    const channel = supabase
      .channel(`tactics-team-${teamId}-${matchId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'match_lineups', 
        filter: `match_id=eq.${matchId}` 
      }, async (payload) => {
        // On vérifie si c'est bien notre équipe (le filtre match_id est plus large)
        const item = (payload.new as any) || (payload.old as any)
        if (item.team_id !== teamId) return

        console.log('📋 Realtime: Tactical update received', payload)
        qc.invalidateQueries({ queryKey: ['match_lineups', matchId] })

        // Si c'est une mise à jour d'un titulaire, on peut notifier
        if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
          const p = payload.new as any
          if (p.is_starter) {
            // On peut optionnellement envoyer une notification locale
            // pushLocal('Tactique mise à jour', 'Le capitaine a modifié la composition', `tactics-${matchId}`)
          }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [teamId, matchId, qc])
}

export function useRealtimeMatchTactics(matchId?: string) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!matchId) return

    // On écoute à la fois les changements DB (si activés) et les broadcast (plus fiable)
    const channel = supabase
      .channel(`tactics-match-${matchId}`)
      // 1. Changements en base de données
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'match_lineups', 
        filter: `match_id=eq.${matchId}` 
      }, () => {
        console.log('📋 Realtime: DB Tactical update')
        qc.invalidateQueries({ queryKey: ['match_lineups', matchId] })
      })
      // 2. Broadcast (Émis par le dashboard capitaine)
      .on('broadcast', { event: 'tactical_update' }, () => {
        console.log('📋 Realtime: Broadcast Tactical update')
        qc.invalidateQueries({ queryKey: ['match_lineups', matchId] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [matchId, qc])
}
