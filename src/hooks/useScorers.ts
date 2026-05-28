import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface ScorerRow {
  player_id: string
  first_name: string
  last_name: string
  avatar_url: string | null
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
    staleTime: 1000 * 60 * 10, // 10 min — ne change qu'après une mise à jour de match
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_scorers', {
        p_season_id: seasonId!,
      })
      if (error) throw error
      const rows = (data ?? []) as Omit<ScorerRow, 'avatar_url'>[]
      if (!rows.length) return [] as ScorerRow[]

      // Enrichir avec les avatars : priorité profil lié, fallback players.avatar_url
      const playerIds = rows.map(r => r.player_id)
      const { data: players } = await supabase
        .from('players')
        .select('id, user_id, avatar_url')
        .in('id', playerIds)

      const userIds = (players ?? []).map(p => p.user_id).filter(Boolean) as string[]
      const profilesMap = new Map<string, string | null>()
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', userIds)
        for (const p of profiles ?? []) profilesMap.set(p.id, p.avatar_url)
      }

      const playersMap = new Map((players ?? []).map(p => [p.id, p]))

      return rows.map(r => {
        const p = playersMap.get(r.player_id)
        const avatar = (p?.user_id ? profilesMap.get(p.user_id) : null) ?? p?.avatar_url ?? null
        return { ...r, avatar_url: avatar } as ScorerRow
      })
    },
  })
}
