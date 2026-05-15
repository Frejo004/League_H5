/**
 * useDisciplinaryStats — Statistiques disciplinaires de la saison
 * Cartons jaunes, rouges et classement fair-play par équipe et par joueur
 * Basé sur la table match_events (type = 'yellow_card' | 'red_card')
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useMatches } from '@/hooks/useMatches'

export interface PlayerDiscipline {
  player_id: string
  first_name: string
  last_name: string
  team_id: string
  team_name: string
  team_color: string
  yellow_cards: number
  red_cards: number
  // 2 jaunes = 1 rouge virtuel pour le score fair-play
  fairplay_score: number
}

export interface TeamDiscipline {
  team_id: string
  team_name: string
  team_color: string
  yellow_cards: number
  red_cards: number
  fairplay_score: number
}

export function useDisciplinaryStats(seasonId?: string) {
  const { data: matches } = useMatches(seasonId)

  return useQuery({
    // On inclut le nombre de matchs dans la queryKey pour que la query se relance
    // automatiquement quand les matchs changent (ex: nouveau match terminé)
    queryKey: ['disciplinary-stats', seasonId, matches?.length ?? 0],
    // On attend que les matchs soient chargés ET qu'il y en ait au moins un
    enabled: !!seasonId && !!matches && matches.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<{
      players: PlayerDiscipline[]
      teams: TeamDiscipline[]
      totalYellow: number
      totalRed: number
    }> => {
      if (!matches?.length) return { players: [], teams: [], totalYellow: 0, totalRed: 0 }

      const matchIds = matches.map(m => m.id)

      // Récupérer tous les événements cartons de la saison
      const { data: events, error } = await supabase
        .from('match_events')
        .select(`
          type, team_id, player_id,
          team:teams!match_events_team_id_fkey(id, name, color),
          player:players!match_events_player_id_fkey(id, first_name, last_name)
        `)
        .in('match_id', matchIds)
        .in('type', ['yellow_card', 'red_card'])

      if (error) throw error
      if (!events?.length) return { players: [], teams: [], totalYellow: 0, totalRed: 0 }

      // Agréger par joueur
      const playerMap = new Map<string, PlayerDiscipline>()
      const teamMap = new Map<string, TeamDiscipline>()

      for (const ev of events) {
        const team = ev.team as { id: string; name: string; color: string } | null
        const player = ev.player as { id: string; first_name: string; last_name: string } | null

        if (!team) continue

        // Équipe
        if (!teamMap.has(team.id)) {
          teamMap.set(team.id, {
            team_id: team.id,
            team_name: team.name,
            team_color: team.color,
            yellow_cards: 0,
            red_cards: 0,
            fairplay_score: 0,
          })
        }
        const td = teamMap.get(team.id)!
        if (ev.type === 'yellow_card') td.yellow_cards++
        if (ev.type === 'red_card') td.red_cards++

        // Joueur
        if (player) {
          if (!playerMap.has(player.id)) {
            playerMap.set(player.id, {
              player_id: player.id,
              first_name: player.first_name,
              last_name: player.last_name,
              team_id: team.id,
              team_name: team.name,
              team_color: team.color,
              yellow_cards: 0,
              red_cards: 0,
              fairplay_score: 0,
            })
          }
          const pd = playerMap.get(player.id)!
          if (ev.type === 'yellow_card') pd.yellow_cards++
          if (ev.type === 'red_card') pd.red_cards++
        }
      }

      // Calculer le score fair-play (moins c'est mieux)
      // Formule : jaune = 1pt, rouge = 3pts
      const players = [...playerMap.values()]
        .map(p => ({ ...p, fairplay_score: p.yellow_cards * 1 + p.red_cards * 3 }))
        .sort((a, b) => b.fairplay_score - a.fairplay_score)

      const teams = [...teamMap.values()]
        .map(t => ({ ...t, fairplay_score: t.yellow_cards * 1 + t.red_cards * 3 }))
        .sort((a, b) => b.fairplay_score - a.fairplay_score)

      const totalYellow = events.filter(e => e.type === 'yellow_card').length
      const totalRed = events.filter(e => e.type === 'red_card').length

      return { players, teams, totalYellow, totalRed }
    },
  })
}
