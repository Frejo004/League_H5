import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface MvpResult {
  player_id: string
  first_name: string
  last_name: string
  team_id: string
  team_name: string
  team_color: string
  votes: number
}

// ── Votes for a single match ──────────────────────────────────────────────────

export function useMvpVotes(matchId?: string) {
  return useQuery({
    queryKey: ['mvp_votes', matchId],
    enabled: !!matchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mvp_votes')
        .select('*, players(id, first_name, last_name, team_id, teams(id, name, color))')
        .eq('match_id', matchId!)
      if (error) throw error
      return data ?? []
    },
  })
}

// ── My vote for a match ───────────────────────────────────────────────────────

export function useMyMvpVote(matchId?: string, userId?: string) {
  return useQuery({
    queryKey: ['mvp_votes', matchId, userId],
    enabled: !!matchId && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mvp_votes')
        .select('*')
        .eq('match_id', matchId!)
        .eq('voted_by', userId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

// ── Cast / update vote ────────────────────────────────────────────────────────

export function useVoteMvp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      matchId,
      playerId,
      votedBy,
    }: {
      matchId: string
      playerId: string
      votedBy: string
    }) => {
      // Upsert: one vote per user per match
      const { data, error } = await supabase
        .from('mvp_votes')
        .upsert(
          { match_id: matchId, player_id: playerId, voted_by: votedBy },
          { onConflict: 'match_id,voted_by' }
        )
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (_data, { matchId, votedBy }) => {
      qc.invalidateQueries({ queryKey: ['mvp_votes', matchId] })
      qc.invalidateQueries({ queryKey: ['mvp_votes', matchId, votedBy] })
    },
  })
}

// ── Season-wide MVP ranking ───────────────────────────────────────────────────

export function useMvpRanking(seasonId?: string) {
  return useQuery({
    queryKey: ['mvp_ranking', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      // Get all completed match IDs for the season
      const { data: matchData, error: matchErr } = await supabase
        .from('matches')
        .select('id')
        .eq('season_id', seasonId!)
        .eq('status', 'completed')
      if (matchErr) throw matchErr

      const matchIds = (matchData ?? []).map(m => m.id)
      if (matchIds.length === 0) return []

      const { data: votes, error: votesErr } = await supabase
        .from('mvp_votes')
        .select('player_id')
        .in('match_id', matchIds)
      if (votesErr) throw votesErr

      // Count votes per player
      const countMap = new Map<string, number>()
      for (const v of votes ?? []) {
        countMap.set(v.player_id, (countMap.get(v.player_id) ?? 0) + 1)
      }
      if (countMap.size === 0) return []

      // Fetch player + team info
      const playerIds = Array.from(countMap.keys())
      const { data: players, error: playersErr } = await supabase
        .from('players')
        .select('id, first_name, last_name, team_id, teams(id, name, color)')
        .in('id', playerIds)
      if (playersErr) throw playersErr

      return (players ?? [])
        .map(p => {
          const team = p.teams as unknown as { id: string; name: string; color: string } | null
          return {
            player_id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            team_id: p.team_id,
            team_name: team?.name ?? '—',
            team_color: team?.color ?? '#16a34a',
            votes: countMap.get(p.id) ?? 0,
          } as MvpResult
        })
        .sort((a, b) => b.votes - a.votes)
    },
  })
}
