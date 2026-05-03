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
      // Fetch match IDs for this season first, then filter goals/assists
      const matchesRes = await supabase
        .from('matches')
        .select('id')
        .eq('season_id', seasonId!)

      if (matchesRes.error) throw matchesRes.error
      const matchIds = (matchesRes.data ?? []).map(m => m.id)

      if (matchIds.length === 0) return []

      // Supabase/PostgreSQL has a limit on IN clause (typically ~65k values)
      // For safety, we'll use chunks if there are too many matches
      const CHUNK_SIZE = 500
      const chunks: string[][] = []
      for (let i = 0; i < matchIds.length; i += CHUNK_SIZE) {
        chunks.push(matchIds.slice(i, i + CHUNK_SIZE))
      }

      let allGoals: Array<{
        player_id: string
        team_id: string
        is_own_goal: boolean
      }> = []
      let allAssists: Array<{
        player_id: string
      }> = []

      for (const chunk of chunks) {
        const [goalsRes, assistsRes] = await Promise.all([
          supabase
            .from('goals')
            .select('player_id, team_id, is_own_goal')
            .in('match_id', chunk),
          supabase
            .from('assists')
            .select('player_id')
            .in('match_id', chunk),
        ])

        if (goalsRes.error) throw goalsRes.error
        if (assistsRes.error) throw assistsRes.error

        allGoals = allGoals.concat(goalsRes.data ?? [])
        allAssists = allAssists.concat(assistsRes.data ?? [])
      }

      // Fetch all players and teams for this season
      const [playersRes, teamsRes] = await Promise.all([
        supabase.from('players').select('id, first_name, last_name, team_id').eq('season_id', seasonId!),
        supabase.from('teams').select('id, name, color').eq('season_id', seasonId!),
      ])

      if (playersRes.error) throw playersRes.error
      if (teamsRes.error) throw teamsRes.error

      const playersMap = new Map(playersRes.data?.map(p => [p.id, p]) ?? [])
      const teamsMap = new Map(teamsRes.data?.map(t => [t.id, t]) ?? [])

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

      for (const g of allGoals) {
        const player = playersMap.get(g.player_id)
        const team = teamsMap.get(g.team_id)
        if (!player || !team) continue
        const row = ensure(player.id, player.first_name, player.last_name, team.id, team.name, team.color)
        if (g.is_own_goal) row.own_goals++
        else row.goals++
      }

      for (const a of allAssists) {
        const player = playersMap.get(a.player_id)
        if (!player) continue
        const team = teamsMap.get(player.team_id)
        if (!team) continue
        const row = ensure(player.id, player.first_name, player.last_name, team.id, team.name, team.color)
        row.assists++
      }

      return Array.from(map.values()).sort(
        (a, b) => b.goals - a.goals || b.assists - a.assists
      )
    },
  })
}
