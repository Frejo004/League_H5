import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tournament, TournamentWithParticipants, TournamentWithMatches, TournamentParticipant } from '@/types/tournament'

// Get all tournaments
export function useTournaments() {
  return useQuery({
    queryKey: ['tournaments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as Tournament[]
    }
  })
}

// Get tournament by slug
export function useTournament(slug: string) {
  return useQuery({
    queryKey: ['tournament', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('slug', slug)
        .single()
      
      if (error) throw error
      return data as Tournament
    },
    enabled: !!slug
  })
}

// Get tournament with participants
export function useTournamentWithParticipants(slug: string) {
  return useQuery({
    queryKey: ['tournament', slug, 'participants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          participants:tournament_participants(
            *,
            player:profiles(id, username, full_name, avatar_url)
          )
        `)
        .eq('slug', slug)
        .single()
      
      if (error) throw error
      return data as TournamentWithParticipants
    },
    enabled: !!slug
  })
}

// Get tournament with matches and bracket
export function useTournamentWithMatches(slug: string) {
  return useQuery({
    queryKey: ['tournament', slug, 'matches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          participants:tournament_participants(
            *,
            player:profiles(id, username, full_name, avatar_url)
          ),
          matches:tournament_matches(
            *,
            player1:profiles(id, username, full_name, avatar_url),
            player2:profiles(id, username, full_name, avatar_url),
            winner:profiles(id, username, full_name, avatar_url)
          )
        `)
        .eq('slug', slug)
        .single()
      
      if (error) throw error
      return data as TournamentWithMatches
    },
    enabled: !!slug
  })
}

// Register for tournament
export function useRegisterTournament() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ tournamentId, playerId }: { tournamentId: string; playerId: string }) => {
      const { data, error } = await supabase
        .from('tournament_participants')
        .insert({
          tournament_id: tournamentId,
          player_id: playerId,
          status: 'registered'
        } as never)
        .select()
        .single()
      
      if (error) throw error
      return data as TournamentParticipant
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] })
      queryClient.invalidateQueries({ queryKey: ['tournament'] })
    }
  })
}

// Create tournament (admin only)
export function useCreateTournament() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (tournament: Partial<Tournament>) => {
      const { data, error } = await supabase
        .from('tournaments')
        .insert(tournament as never)
        .select()
        .single()
      
      if (error) throw error
      return data as Tournament
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] })
    }
  })
}

// Update match result - TODO: Fix TypeScript typing issues with Supabase
// export function useUpdateMatchResult() {
//   const queryClient = useQueryClient()
//   
//   return useMutation({
//     mutationFn: async ({ matchId, result, winnerId }: { matchId: string; result: string; winnerId?: string }) => {
//       const { data, error } = await supabase
//         .from('tournament_matches')
//         .update({
//           result,
//           winner_id: winnerId || null,
//           status: 'completed',
//           completed_at: new Date().toISOString()
//         })
//         .eq('id', matchId)
//         .select()
//         .single()
//       
//       if (error) throw error
//       return data as TournamentMatch
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ['tournament'] })
//     }
//   })
// }
