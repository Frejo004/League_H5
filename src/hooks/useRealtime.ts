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
      // Changement sur n'importe quel match de la saison
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `season_id=eq.${seasonId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['matches', seasonId] })
          qc.invalidateQueries({ queryKey: ['standings', seasonId] })
        }
      )
      // Changement sur les buts (impacte buteurs + classement)
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
