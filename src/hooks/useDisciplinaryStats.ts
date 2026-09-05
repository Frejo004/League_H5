/**
 * useDisciplinaryStats — Statistiques disciplinaires de la saison
 * Cartons jaunes, rouges et classement fair-play par équipe et par joueur
 * Basé sur la table match_events (type = 'yellow_card' | 'red_card')
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMatches } from '@/hooks/useMatches'
import { supabase } from '@/lib/supabase'
import { useRealtimeInvalidate } from './useRealtimeInvalidate'

// Helper pour bypasser les types générés Supabase sur les tables non reconnues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export interface Suspension {
  id: string
  player_id: string
  season_id: string
  match_id_trigger: string | null
  reason: string
  matches_count: number
  matches_served: number
  is_active: boolean
  is_auto_generated: boolean
  source_event_ids?: string[] | null
  created_at: string
  player?: { 
    id: string;
    first_name: string; 
    last_name: string; 
    team?: { id: string; name: string; color: string } 
  }
}

export interface PlayerDiscipline {
  player_id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  team_id: string
  team_name: string
  team_color: string
  yellow_cards: number
  red_cards: number
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

/**
 * usePlayerDiscipline — Cartons d'un joueur spécifique sur une saison
 */
export function usePlayerDiscipline(playerId?: string, seasonId?: string) {
  return useQuery({
    queryKey: ['player-discipline', playerId, seasonId],
    enabled: !!playerId && !!seasonId,
    staleTime: 60_000,
    queryFn: async (): Promise<{ yellow_cards: number; red_cards: number; fairplay_score: number }> => {
      const { data: matchData, error: matchErr } = await supabase
        .from('matches')
        .select('id')
        .eq('season_id', seasonId!) as { data: { id: string }[] | null; error: { message: string } | null }
      if (matchErr) throw matchErr

      const matchIds = (matchData ?? []).map(m => m.id)
      if (matchIds.length === 0) return { yellow_cards: 0, red_cards: 0, fairplay_score: 0 }

      const { data: events, error } = await db
        .from('match_events')
        .select('type')
        .eq('player_id', playerId!)
        .in('match_id', matchIds)
        .in('type', ['yellow_card', 'red_card']) as { data: { type: string }[] | null; error: { message: string } | null }

      if (error) throw error

      const yellow_cards = (events ?? []).filter((e: { type: string }) => e.type === 'yellow_card').length
      const red_cards = (events ?? []).filter((e: { type: string }) => e.type === 'red_card').length
      return {
        yellow_cards,
        red_cards,
        fairplay_score: yellow_cards + red_cards * 3,
      }
    },
  })
}

export function useDisciplinaryStats(seasonId?: string) {
  const { data: matches } = useMatches(seasonId)

  return useQuery({
    queryKey: ['disciplinary-stats', seasonId, matches?.length ?? 0],
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

      interface EventRow {
        type: 'yellow_card' | 'red_card'
        team_id: string
        player_id: string | null
        team: { id: string; name: string; color: string } | null
        player: { id: string; first_name: string; last_name: string; user_id: string | null; avatar_url: string | null } | null
      }

      const { data, error } = await db
        .from('match_events')
        .select(`
          type, team_id, player_id,
          team:teams(id, name, color),
          player:players(id, first_name, last_name, user_id, avatar_url)
        `)
        .in('match_id', matchIds)
        .in('type', ['yellow_card', 'red_card']) as { data: EventRow[] | null; error: { message: string } | null }

      if (error) throw error
      const events = data ?? []
      if (!events.length) return { players: [], teams: [], totalYellow: 0, totalRed: 0 }

      // Avatars depuis profiles
      const allUserIds = [...new Set(events.map(e => e.player?.user_id).filter(Boolean) as string[])]
      const profilesMap = new Map<string, string | null>()
      if (allUserIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', allUserIds) as { data: { id: string; avatar_url: string | null }[] | null; error: unknown }
        for (const pr of profiles ?? []) profilesMap.set(pr.id, pr.avatar_url)
      }

      const playerMap = new Map<string, PlayerDiscipline>()
      const teamMap = new Map<string, TeamDiscipline>()

      for (const ev of events) {
        const team = ev.team
        const player = ev.player
        if (!team) continue

        if (!teamMap.has(team.id)) {
          teamMap.set(team.id, { team_id: team.id, team_name: team.name, team_color: team.color, yellow_cards: 0, red_cards: 0, fairplay_score: 0 })
        }
        const td = teamMap.get(team.id)!
        if (ev.type === 'yellow_card') td.yellow_cards++
        if (ev.type === 'red_card') td.red_cards++

        if (player) {
          const avatar = (player.user_id ? profilesMap.get(player.user_id) : null) ?? player.avatar_url ?? null
          if (!playerMap.has(player.id)) {
            playerMap.set(player.id, {
              player_id: player.id, first_name: player.first_name, last_name: player.last_name,
              avatar_url: avatar, team_id: team.id, team_name: team.name, team_color: team.color,
              yellow_cards: 0, red_cards: 0, fairplay_score: 0,
            })
          }
          const pd = playerMap.get(player.id)!
          if (ev.type === 'yellow_card') pd.yellow_cards++
          if (ev.type === 'red_card') pd.red_cards++
        }
      }

      const players = [...playerMap.values()]
        .map(p => ({ ...p, fairplay_score: p.yellow_cards * 1 + p.red_cards * 3 }))
        .sort((a, b) => b.fairplay_score - a.fairplay_score)

      const teams = [...teamMap.values()]
        .map(t => ({ ...t, fairplay_score: t.yellow_cards * 1 + t.red_cards * 3 }))
        .sort((a, b) => b.fairplay_score - a.fairplay_score)

      return {
        players,
        teams,
        totalYellow: events.filter(e => e.type === 'yellow_card').length,
        totalRed: events.filter(e => e.type === 'red_card').length,
      }
    },
  })
}

export function useSuspensions(seasonId?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['suspensions', seasonId],
    enabled: !!seasonId,
    staleTime: 30_000,
    queryFn: async (): Promise<Suspension[]> => {
      // Étape 1 : suspensions de base
      const { data, error } = await db
        .from('suspensions')
        .select('id, player_id, season_id, match_id_trigger, reason, matches_count, matches_served, is_active, is_auto_generated, created_at')
        .eq('season_id', seasonId!)
        .order('created_at', { ascending: false }) as {
          data: Array<{
            id: string; player_id: string; season_id: string
            match_id_trigger: string | null; reason: string
            matches_count: number; matches_served: number
            is_active: boolean; is_auto_generated: boolean
            created_at: string
          }> | null
          error: { message: string } | null
        }

      if (error) {
        console.error('[useSuspensions] Query error:', error)
        throw error
      }
      if (!data?.length) return []

      // Étape 2 : infos joueurs
      const playerIds = [...new Set(data.map(s => s.player_id))]
      const { data: players } = await supabase
        .from('players')
        .select('id, first_name, last_name, team_id')
        .in('id', playerIds) as unknown as {
          data: Array<{ id: string; first_name: string; last_name: string; team_id: string }> | null
        }

      const teamIds = [...new Set((players ?? []).map(p => p.team_id).filter(Boolean))]
      const { data: teams } = teamIds.length
        ? await supabase.from('teams').select('id, name, color').in('id', teamIds) as unknown as {
            data: Array<{ id: string; name: string; color: string }> | null
          }
        : { data: [] as Array<{ id: string; name: string; color: string }> }

      const teamMap = new Map((teams ?? []).map(t => [t.id, t]))
      const playerMap = new Map((players ?? []).map(p => [p.id, {
        id: p.id, first_name: p.first_name, last_name: p.last_name,
        team: p.team_id ? (teamMap.get(p.team_id) ?? null) : null,
      }]))

      return data.map(s => ({
        ...s,
        player: playerMap.get(s.player_id) ?? null,
      })) as Suspension[]
    },
  })

  // Realtime — dédoublonné via useRealtimeInvalidate (cf. useRealtimeInvalidate.ts)
  useRealtimeInvalidate({
    name: `suspensions-realtime-${seasonId ?? 'none'}`,
    table: 'suspensions',
    queryKeys: [
      ['suspensions', seasonId],
      ['my-active-suspension'],
      ['suspended-player-ids'],
    ],
    enabled: !!seasonId,
  })

  const addSuspension = useMutation({
    mutationFn: async (payload: Partial<Suspension>) => {
      const { data, error } = await db.from('suspensions').insert({
        player_id: payload.player_id!,
        season_id: payload.season_id!,
        reason: payload.reason!,
        match_id_trigger: payload.match_id_trigger ?? null,
        matches_count: payload.matches_count ?? 1,
        matches_served: payload.matches_served ?? 0,
        is_active: payload.is_active ?? true,
        is_auto_generated: payload.is_auto_generated ?? false,
      }).select().single() as { data: Suspension | null; error: { message: string } | null }
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suspensions'] })
      queryClient.invalidateQueries({ queryKey: ['my-active-suspension'] })
      queryClient.invalidateQueries({ queryKey: ['suspended-player-ids'] })
    },
  })

  const toggleSuspension = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await db.from('suspensions').update({ is_active }).eq('id', id) as { error: { message: string } | null }
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suspensions'] })
      queryClient.invalidateQueries({ queryKey: ['my-active-suspension'] })
      queryClient.invalidateQueries({ queryKey: ['suspended-player-ids'] })
    },
  })

  const deleteSuspension = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('suspensions').delete().eq('id', id) as { error: { message: string } | null }
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suspensions'] })
      queryClient.invalidateQueries({ queryKey: ['suspended-player-ids'] })
    },
  })

  const updateServed = useMutation({
    mutationFn: async ({ id, matches_served }: { id: string; matches_served: number }) => {
      const { error } = await db.from('suspensions').update({ matches_served }).eq('id', id) as { error: { message: string } | null }
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suspensions'] }),
  })

  return { ...query, addSuspension, toggleSuspension, deleteSuspension, updateServed }
}

/**
 * useActiveSuspendedPlayerIds — IDs des joueurs actuellement suspendus
 */
export function useActiveSuspendedPlayerIds(seasonId?: string) {
  return useQuery({
    queryKey: ['suspended-player-ids', seasonId],
    enabled: !!seasonId,
    staleTime: 30_000,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await db
        .from('suspensions')
        .select('player_id')
        .eq('season_id', seasonId!)
        .eq('is_active', true) as { data: { player_id: string }[] | null; error: { message: string } | null }
      if (error) throw error
      return new Set((data ?? []).map((s: { player_id: string }) => s.player_id))
    },
  })
}

/**
 * useMyActiveSuspension — Suspension active du joueur connecté
 */
export function useMyActiveSuspension(userId?: string, seasonId?: string) {
  return useQuery({
    queryKey: ['my-active-suspension', userId, seasonId],
    enabled: !!userId && !!seasonId,
    staleTime: 30_000,
    queryFn: async (): Promise<Suspension | null> => {
      const { data: player } = await supabase
        .from('players')
        .select('id')
        .eq('user_id', userId!)
        .maybeSingle() as unknown as { data: { id: string } | null }

      if (!player) return null

      const { data, error } = await db
        .from('suspensions')
        .select('id, player_id, season_id, match_id_trigger, reason, matches_count, matches_served, is_active, is_auto_generated, created_at')
        .eq('player_id', player.id)
        .eq('season_id', seasonId!)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle() as { data: Suspension | null; error: { message: string } | null }

      if (error) throw error
      return data
    },
  })
}
