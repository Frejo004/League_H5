/**
 * useDisciplinaryStats — Statistiques disciplinaires de la saison
 * Cartons jaunes, rouges et classement fair-play par équipe et par joueur
 * Basé sur la table match_events (type = 'yellow_card' | 'red_card')
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useMatches } from '@/hooks/useMatches'

export interface Suspension {
  id: string
  player_id: string
  season_id: string
  match_id_trigger: string | null
  reason: string
  matches_count: number
  matches_served: number
  is_active: boolean
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

/**
 * usePlayerDiscipline — Cartons d'un joueur spécifique sur une saison
 * Utilisé dans le CompareModal et le profil joueur
 */
export function usePlayerDiscipline(playerId?: string, seasonId?: string) {
  return useQuery({
    queryKey: ['player-discipline', playerId, seasonId],
    enabled: !!playerId && !!seasonId,
    staleTime: 60_000,
    queryFn: async (): Promise<{ yellow_cards: number; red_cards: number; fairplay_score: number }> => {
      // Récupérer les matchs de la saison pour filtrer les événements
      const { data: matchData, error: matchErr } = await supabase
        .from('matches')
        .select('id')
        .eq('season_id', seasonId!)
      if (matchErr) throw matchErr

      const matchIds = (matchData ?? []).map(m => m.id)
      if (matchIds.length === 0) return { yellow_cards: 0, red_cards: 0, fairplay_score: 0 }

      const { data: events, error } = await supabase
        .from('match_events')
        .select('type')
        .eq('player_id', playerId!)
        .in('match_id', matchIds)
        .in('type', ['yellow_card', 'red_card'])

      if (error) throw error

      const yellow_cards = (events ?? []).filter(e => e.type === 'yellow_card').length
      const red_cards = (events ?? []).filter(e => e.type === 'red_card').length
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

      interface EventRow {
        type: 'yellow_card' | 'red_card'
        team_id: string
        player_id: string | null
        team: { id: string; name: string; color: string } | null
        player: { id: string; first_name: string; last_name: string; user_id: string | null; avatar_url: string | null } | null
      }

      // Récupérer tous les événements cartons de la saison
      const { data, error } = await supabase
        .from('match_events')
        .select(`
          type, team_id, player_id,
          team:teams(id, name, color),
          player:players(id, first_name, last_name, user_id, avatar_url)
        `)
        .in('match_id', matchIds)
        .in('type', ['yellow_card', 'red_card'])

      const events = data as unknown as EventRow[]

      if (error) throw error
      if (!events?.length) return { players: [], teams: [], totalYellow: 0, totalRed: 0 }

      // Récupérer les avatars depuis profiles pour les joueurs avec user_id
      const allPlayerIds = [...new Set(
        events.map(e => e.player?.user_id).filter(Boolean) as string[]
      )]
      const profilesMap = new Map<string, string | null>()
      if (allPlayerIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', allPlayerIds)
        for (const pr of profiles ?? []) profilesMap.set(pr.id, pr.avatar_url)
      }

      // Agréger par joueur
      const playerMap = new Map<string, PlayerDiscipline>()
      const teamMap = new Map<string, TeamDiscipline>()

      for (const ev of events) {
        const team = ev.team as { id: string; name: string; color: string } | null
        const player = ev.player as EventRow['player']

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
          const avatar = (player.user_id ? profilesMap.get(player.user_id) : null) ?? player.avatar_url ?? null
          if (!playerMap.has(player.id)) {
            playerMap.set(player.id, {
              player_id: player.id,
              first_name: player.first_name,
              last_name: player.last_name,
              avatar_url: avatar,
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

export function useSuspensions(seasonId?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['suspensions', seasonId],
    enabled: !!seasonId,
    queryFn: async (): Promise<Suspension[]> => {
      const { data, error } = await supabase
        .from('suspensions')
        .select(`
          *,
          player:players(
            id,
            first_name, 
            last_name,
            team:teams(id, name, color)
          )
        `)
        .eq('season_id', seasonId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as Suspension[]
    },
  })

  const addSuspension = useMutation({
    mutationFn: async (payload: Partial<Suspension>) => {
      const { data, error } = await supabase.from('suspensions').insert({
        player_id: payload.player_id!,
        season_id: payload.season_id!,
        reason: payload.reason!,
        match_id_trigger: payload.match_id_trigger ?? null,
        matches_count: payload.matches_count ?? 0,
        matches_served: payload.matches_served ?? 0,
        is_active: payload.is_active ?? true,
      }).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suspensions'] }),
  })

  const toggleSuspension = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('suspensions').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suspensions'] }),
  })

  const deleteSuspension = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suspensions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suspensions'] }),
  })

  const updateServed = useMutation({
    mutationFn: async ({ id, matches_served }: { id: string; matches_served: number }) => {
      const { error } = await supabase.from('suspensions').update({ matches_served }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suspensions'] }),
  })

  return { 
    ...query, 
    addSuspension, 
    toggleSuspension, 
    deleteSuspension, 
    updateServed 
  }
}
