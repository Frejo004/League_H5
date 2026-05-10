/**
 * Hooks Supabase Realtime
 *
 * Deux hooks :
 *  - useRealtimeMatch  : s'abonne aux changements d'un match précis
 *                        (score, buts, passes) → invalide le cache du détail
 *  - useRealtimeMatches: s'abonne aux changements de tous les matchs d'une saison
 *                        → invalide la liste + classement + buteurs
 *
 * Pattern :
 *  1. Créer un channel nommé de façon unique
 *  2. S'abonner aux events postgres_changes sur les tables concernées
 *  3. Sur chaque event → invalider les queries TanStack Query correspondantes
 *  4. Cleanup : removeChannel() au unmount
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// ── Realtime pour le détail d'un match ───────────────────────────────────────
// Utilisé dans MatchDetailPage — met à jour le score, les buts et les passes
// en temps réel sans recharger la page.

export function useRealtimeMatch(matchId?: string) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!matchId) return

    const channel = supabase
      .channel(`match-detail-${matchId}`)
      // Changement de score / statut du match
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['matches', 'detail', matchId] })
        }
      )
      // Nouveau but / suppression de but
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['matches', 'detail', matchId] })
        }
      )
      // Nouvelle passe / suppression de passe
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'assists',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['matches', 'detail', matchId] })
        }
      )
      // Nouveau vote MVP
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mvp_votes',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['mvp_votes', matchId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
