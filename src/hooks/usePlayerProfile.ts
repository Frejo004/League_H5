import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface PlayerProfileData {
  id: string
  first_name: string
  last_name: string
  jersey_number: number | null
  position: string | null
  avatar_url: string | null
  team_id: string
  season_id: string
  team: { id: string; name: string; color: string }
  // Stats saison
  goals: number
  assists: number
  own_goals: number
  matches_played: number
  // Derniers matchs joués
  recent_matches: Array<{
    match_id: string
    matchday: number
    played_at: string | null
    home_team: { id: string; name: string; color: string }
    away_team: { id: string; name: string; color: string }
    home_score: number
    away_score: number
    player_team_id: string
    goals_in_match: number
    assists_in_match: number
    result: 'W' | 'D' | 'L'
  }>
}

export function usePlayerProfile(playerId?: string) {
  return useQuery({
    queryKey: ['player_profile', playerId],
    enabled: !!playerId,
    queryFn: async () => {
      // 1. Fetch player + team (deux requêtes séparées pour éviter les problèmes de FK)
      const { data: player, error: playerErr } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId!)
        .single()
      if (playerErr) throw playerErr

      const { data: teamData, error: teamErr } = await supabase
        .from('teams')
        .select('id, name, color')
        .eq('id', player.team_id)
        .single()
      if (teamErr) throw teamErr

      const team = teamData as { id: string; name: string; color: string }

      // 2. Fetch all completed matches for this season involving this team
      const { data: matches, error: matchErr } = await supabase
        .from('matches')
        .select(`
          id, matchday, played_at, home_score, away_score,
          home_team_id, away_team_id,
          home_team:teams!home_team_id(id, name, color),
          away_team:teams!away_team_id(id, name, color)
        `)
        .eq('season_id', player.season_id)
        .eq('status', 'completed')
        .or(`home_team_id.eq.${player.team_id},away_team_id.eq.${player.team_id}`)
        .order('played_at', { ascending: false })
      if (matchErr) throw matchErr

      const matchIds = (matches ?? []).map(m => m.id)

      // 3. Fetch goals & assists for this player
      const [goalsRes, assistsRes] = await Promise.all([
        matchIds.length > 0
          ? supabase.from('goals').select('match_id, is_own_goal').eq('player_id', playerId!).in('match_id', matchIds)
          : Promise.resolve({ data: [], error: null }),
        matchIds.length > 0
          ? supabase.from('assists').select('match_id').eq('player_id', playerId!).in('match_id', matchIds)
          : Promise.resolve({ data: [], error: null }),
      ])
      if (goalsRes.error) throw goalsRes.error
      if (assistsRes.error) throw assistsRes.error

      const goals   = goalsRes.data ?? []
      const assists = assistsRes.data ?? []

      // Aggregate stats
      const totalGoals   = goals.filter(g => !g.is_own_goal).length
      const totalOwnGoals = goals.filter(g => g.is_own_goal).length
      const totalAssists = assists.length
      const matchesPlayed = new Set([
        ...goals.map(g => g.match_id),
        ...assists.map(a => a.match_id),
      ]).size

      // Goals/assists per match
      const goalsByMatch   = new Map<string, number>()
      const assistsByMatch = new Map<string, number>()
      for (const g of goals.filter(g => !g.is_own_goal)) {
        goalsByMatch.set(g.match_id, (goalsByMatch.get(g.match_id) ?? 0) + 1)
      }
      for (const a of assists) {
        assistsByMatch.set(a.match_id, (assistsByMatch.get(a.match_id) ?? 0) + 1)
      }

      // Build recent matches
      const recentMatches = (matches ?? []).slice(0, 10).map(m => {
        const isHome = m.home_team_id === player.team_id
        const myScore  = isHome ? m.home_score! : m.away_score!
        const oppScore = isHome ? m.away_score! : m.home_score!
        const result: 'W' | 'D' | 'L' = myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D'

        return {
          match_id: m.id,
          matchday: m.matchday,
          played_at: m.played_at,
          home_team: m.home_team as unknown as { id: string; name: string; color: string },
          away_team: m.away_team as unknown as { id: string; name: string; color: string },
          home_score: m.home_score!,
          away_score: m.away_score!,
          player_team_id: player.team_id,
          goals_in_match: goalsByMatch.get(m.id) ?? 0,
          assists_in_match: assistsByMatch.get(m.id) ?? 0,
          result,
        }
      })

      return {
        id: player.id,
        first_name: player.first_name,
        last_name: player.last_name,
        jersey_number: player.jersey_number,
        position: player.position,
        avatar_url: player.avatar_url,
        team_id: player.team_id,
        season_id: player.season_id,
        team,
        goals: totalGoals,
        assists: totalAssists,
        own_goals: totalOwnGoals,
        matches_played: matchesPlayed,
        recent_matches: recentMatches,
      } as PlayerProfileData
    },
  })
}
