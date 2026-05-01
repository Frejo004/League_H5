import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ScorerRow {
  player_id: string
  first_name: string
  last_name: string
  team_id: string
  team_name: string
  team_color: string
  goals: number
  assists: number
  own_goals: number
}

export function useScorers(seasonId?: string) {
  return useQuery({
    queryKey: ['scorers', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      const [goalsRes, assistsRes] = await Promise.all([
        supabase
          .from('goals')
          .select(`
            player_id, team_id, is_own_goal,
            players(id, first_name, last_name),
            teams(id, name, color),
            matches!inner(season_id)
          `)
          .eq('matches.season_id', seasonId!),
        supabase
          .from('assists')
          .select(`
            player_id,
            players(id, first_name, last_name, team_id, teams(id, name, color)),
            matches!inner(season_id)
          `)
          .eq('matches.season_id', seasonId!),
      ])

      if (goalsRes.error) throw goalsRes.error
      if (assistsRes.error) throw assistsRes.error

      const map = new Map<string, ScorerRow>()

      function ensure(
        playerId: string,
        firstName: string,
        lastName: string,
        teamId: string,
        teamName: string,
        teamColor: string
      ) {
        if (!map.has(playerId)) {
          map.set(playerId, {
            player_id: playerId,
            first_name: firstName,
            last_name: lastName,
            team_id: teamId,
            team_name: teamName,
            team_color: teamColor,
            goals: 0,
            assists: 0,
            own_goals: 0,
          })
        }
        return map.get(playerId)!
      }

      for (const g of goalsRes.data ?? []) {
        const p = g.players as { id: string; first_name: string; last_name: string }
        const t = g.teams as { id: string; name: string; color: string }
        const row = ensure(p.id, p.first_name, p.last_name, t.id, t.name, t.color)
        if (g.is_own_goal) row.own_goals++
        else row.goals++
      }

      for (const a of assistsRes.data ?? []) {
        const p = a.players as {
          id: string; first_name: string; last_name: string; team_id: string
          teams: { id: string; name: string; color: string }
        }
        const row = ensure(p.id, p.first_name, p.last_name, p.team_id, p.teams.name, p.teams.color)
        row.assists++
      }

      return Array.from(map.values()).sort(
        (a, b) => b.goals - a.goals || b.assists - a.assists
      )
    },
  })
}
