import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

type RpcFn = (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
const rpc = supabase.rpc as unknown as RpcFn

interface PlayerWithAvatarSlug {
  id: string
  user_id: string | null
  avatar_url: string | null
  slug: string | null
}

interface ProfileAvatarRow {
  id: string
  avatar_url: string | null
}

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
  player_slug?: string | null
}

export function useScorers(seasonId?: string) {
  return useQuery({
    queryKey: ['scorers', seasonId],
    enabled: !!seasonId,
    staleTime: 1000 * 60 * 10, // 10 min — ne change qu'après une mise à jour de match
    queryFn: async () => {
      const { data, error } = await rpc('get_scorers', {
        p_season_id: seasonId!,
      })
      if (error) throw error
      const rows = (data ?? []) as Omit<ScorerRow, 'avatar_url'>[]
      if (!rows.length) return [] as ScorerRow[]

      const playerIds = rows.map(r => r.player_id)
      const { data: players } = await supabase
        .from('players')
        .select('id, user_id, avatar_url, slug')
        .in('id', playerIds)

      const playersArr = (players ?? []) as PlayerWithAvatarSlug[]
      const userIds = playersArr.map(p => p.user_id).filter((id): id is string => Boolean(id))
      const profilesMap = new Map<string, string | null>()
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', userIds)
        for (const p of (profiles ?? []) as ProfileAvatarRow[]) profilesMap.set(p.id, p.avatar_url)
      }

      const playersMap = new Map(playersArr.map(p => [p.id, p]))

      return rows.map(r => {
        const p = playersMap.get(r.player_id)
        const avatar = (p?.user_id ? profilesMap.get(p.user_id) : null) ?? p?.avatar_url ?? null
        return {
          ...r,
          avatar_url: avatar,
          player_slug: p?.slug ?? null,
        } as ScorerRow
      })
    },
  })
}
