/**
 * Hooks Supabase Realtime
 * + Notifications push locales pour les événements clés
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Helper : envoyer une notification locale si permission accordée
function pushLocal(title: string, body: string, tag?: string, url?: string) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  if (document.visibilityState === 'visible') return

  const n = new Notification(title, {
    body,
    icon: '/logo-h5.png',
    badge: '/logo-h5.png',
    tag,
  })
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `match_id=eq.${matchId}` },
        (payload) => {
          console.log('⚽ Realtime: Goal update received', payload)
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_events', filter: `match_id=eq.${matchId}` },
        (payload) => {
          console.log('📝 Realtime: Event update received', payload)
          qc.invalidateQueries({ queryKey: ['matches', 'detail', matchId] })
          qc.invalidateQueries({ queryKey: ['match-events', matchId] })
        }
      )
      .subscribe((status) => {
        console.log(`📡 Realtime Status (${matchId}):`, status)
      })

    return () => { supabase.removeChannel(channel) }
  }, [matchId, qc])
}

// ── Realtime pour la liste des matchs d'une saison ───────────────────────────
// Utilisé dans DashboardPage, MatchesPage — met à jour les scores
// et le classement en temps réel.

export function useRealtimeMatches(seasonId?: string) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!seasonId) return

    const channel = supabase
      .channel(`matches-season-${seasonId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `season_id=eq.${seasonId}`,
        },
        async (payload) => {
          qc.invalidateQueries({ queryKey: ['matches', seasonId] })
          qc.invalidateQueries({ queryKey: ['standings', seasonId] })

          // Notification push quand un match passe en live
          const newMatch = payload.new as { status?: string; home_team_id?: string; away_team_id?: string }
          const oldMatch = payload.old as { status?: string }
          if (
            newMatch.status === 'live' &&
            oldMatch.status !== 'live' &&
            typeof Notification !== 'undefined' &&
            Notification.permission === 'granted' &&
            document.visibilityState !== 'visible'
          ) {
            // Récupérer les noms des équipes
            const { data: match } = await supabase
              .from('matches')
              .select('home_team:teams!home_team_id(name), away_team:teams!away_team_id(name)')
              .eq('id', (payload.new as any).id)
              .single()
            const home = (match as any)?.home_team?.name ?? 'Équipe A'
            const away = (match as any)?.away_team?.name ?? 'Équipe B'
            new Notification('🔴 Match en direct !', {
              body: `${home} vs ${away} vient de commencer`,
              icon: '/logo-h5.png',
              badge: '/logo-h5.png',
              tag: `live-${(payload.new as any).id}`,
            })
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
        },
        () => {
          qc.invalidateQueries({ queryKey: ['scorers', seasonId] })
          qc.invalidateQueries({ queryKey: ['standings', seasonId] })
        }
      )
      .subscribe()

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
      // Changement sur n'importe quelle équipe de la saison
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `season_id=eq.${seasonId}`,
        },
        () => {
          // Invalider toutes les queries qui contiennent des données d'équipes
          qc.invalidateQueries({ queryKey: ['teams'] })
          qc.invalidateQueries({ queryKey: ['matches'] })
          qc.invalidateQueries({ queryKey: ['standings'] })
          qc.invalidateQueries({ queryKey: ['scorers'] })
          qc.invalidateQueries({ queryKey: ['mvp-ranking'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [seasonId, qc])
}
