import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Player, TeamRef } from '@/types/database'

type PlayerProfileRaw = Pick<
  Player,
  | 'id'
  | 'first_name'
  | 'last_name'
  | 'jersey_number'
  | 'position'
  | 'avatar_url'
  | 'team_id'
  | 'slug'
  | 'season_id'
  | 'user_id'
> & {
  team: TeamRef | TeamRef[] | null
}

export interface PlayerProfileData {
  id: string
  first_name: string
  last_name: string
  jersey_number: number | null
  position: string | null
  avatar_url: string | null
  team_id: string
  slug: string
  season_id: string
  team: TeamRef
  // Stats saison
  goals: number
  assists: number
  own_goals: number
  matches_played: number
  // Derniers matchs joués
  recent_matches: Array<{
    match_id: string
    match_slug: string
    matchday: number
    played_at: string | null
    home_team: TeamRef
    away_team: TeamRef
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
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      // ── Requête 1 : player + team + profil lié ──────────────────────────────
      const { data: playerRaw, error: playerErr } = await supabase
        .from('players')
        .select('*, slug, team:teams!team_id(id, name, color)')
        .eq('id', playerId!)
        .single()
      if (playerErr) throw playerErr

      return fetchPlayerProfileData(playerRaw as unknown as PlayerProfileRaw);
    },
  })
}

/**
 * Hook pour récupérer un profil de joueur par son slug
 * @param slug - Le slug du joueur (ex: "kylian-mbappe")
 * @param seasonId - L'ID de la saison (optionnel, utilise la saison active par défaut)
 */
export function usePlayerProfileBySlug(slug?: string, seasonId?: string) {
  return useQuery({
    queryKey: ['player_profile', 'slug', slug, seasonId],
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      // D'abord, récupérer le joueur par slug
      let query = supabase
        .from('players')
        .select('*, slug, team:teams!team_id(id, name, color)')
        .eq('slug', slug!)
      
      if (seasonId) {
        query = query.eq('season_id', seasonId)
      }
      
      const { data: playerRaw, error: playerErr } = await query.single()
      if (playerErr) throw playerErr

      return fetchPlayerProfileData(playerRaw as unknown as PlayerProfileRaw);
    },
  })
}

// Fonction utilitaire pour éviter la duplication de code
async function fetchPlayerProfileData(playerRaw: PlayerProfileRaw): Promise<PlayerProfileData> {
  const team = (Array.isArray(playerRaw.team) ? playerRaw.team[0] : playerRaw.team) as TeamRef

  // Récupère l'avatar depuis profiles si le joueur a un compte
  let resolvedAvatarUrl: string | null = playerRaw.avatar_url
  if (playerRaw.user_id) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', playerRaw.user_id)
      .single()
    if (prof?.avatar_url) resolvedAvatarUrl = prof.avatar_url
  }

  // ── Requêtes 2+3+4 en parallèle ─────────────────────────────────────────
  const [matchesRes, goalsRes, assistsRes] = await Promise.all([
    // Matchs terminés de la saison impliquant l'équipe du joueur
    supabase
      .from('matches')
      .select(`
        id, slug, matchday, played_at, home_score, away_score,
        home_team_id, away_team_id,
        home_team:teams!home_team_id(id, name, color),
        away_team:teams!away_team_id(id, name, color)
      `)
      .eq('season_id', playerRaw.season_id)
      .eq('status', 'completed')
      .or(`home_team_id.eq.${playerRaw.team_id},away_team_id.eq.${playerRaw.team_id}`)
      .order('played_at', { ascending: false }),

    // Buts du joueur dans la saison
    supabase
      .from('goals')
      .select('match_id, is_own_goal')
      .eq('player_id', playerRaw.id),

    // Passes du joueur dans la saison
    supabase
      .from('assists')
      .select('match_id')
      .eq('player_id', playerRaw.id),
  ])

  if (matchesRes.error) throw matchesRes.error
  if (goalsRes.error)   throw goalsRes.error
  if (assistsRes.error) throw assistsRes.error

  const matches = matchesRes.data ?? []
  const goals   = goalsRes.data ?? []
  const assists = assistsRes.data ?? []

  // Filtrer goals/assists sur les matchs de la saison uniquement
  const matchIdSet = new Set(matches.map(m => m.id))
  const seasonGoals   = goals.filter(g => matchIdSet.has(g.match_id))
  const seasonAssists = assists.filter(a => matchIdSet.has(a.match_id))

  // ── Agrégation des stats ─────────────────────────────────────────────────
  const totalGoals    = seasonGoals.filter(g => !g.is_own_goal).length
  const totalOwnGoals = seasonGoals.filter(g => g.is_own_goal).length
  const totalAssists  = seasonAssists.length
  // matchesPlayed = tous les matchs terminés de l'équipe dans la saison
  // (indépendamment des contributions du joueur)
  const matchesPlayed = matches.length

  // Goals/assists par match pour l'affichage
  const goalsByMatch   = new Map<string, number>()
  const assistsByMatch = new Map<string, number>()
  for (const g of seasonGoals.filter(g => !g.is_own_goal)) {
    goalsByMatch.set(g.match_id, (goalsByMatch.get(g.match_id) ?? 0) + 1)
  }
  for (const a of seasonAssists) {
    assistsByMatch.set(a.match_id, (assistsByMatch.get(a.match_id) ?? 0) + 1)
  }

  // ── Construction des derniers matchs ─────────────────────────────────────
  const recentMatches = matches.slice(0, 10).map(m => {
    const isHome   = m.home_team_id === playerRaw.team_id
    const myScore  = isHome ? m.home_score! : m.away_score!
    const oppScore = isHome ? m.away_score! : m.home_score!
    const result: 'W' | 'D' | 'L' = myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D'

    return {
      match_id:        m.id,
      match_slug:      m.slug,
      matchday:        m.matchday,
      played_at:       m.played_at,
      home_team:       (Array.isArray(m.home_team) ? m.home_team[0] : m.home_team) as TeamRef,
      away_team:       (Array.isArray(m.away_team) ? m.away_team[0] : m.away_team) as TeamRef,
      home_score:      m.home_score!,
      away_score:      m.away_score!,
      player_team_id:  playerRaw.team_id,
      goals_in_match:  goalsByMatch.get(m.id) ?? 0,
      assists_in_match: assistsByMatch.get(m.id) ?? 0,
      result,
    }
  })

  return {
    id:            playerRaw.id,
    first_name:    playerRaw.first_name,
    last_name:     playerRaw.last_name,
    jersey_number: playerRaw.jersey_number,
    position:      playerRaw.position,
    avatar_url:    resolvedAvatarUrl,
    team_id:       playerRaw.team_id,
    slug:          playerRaw.slug,
    season_id:     playerRaw.season_id,
    team,
    goals:         totalGoals,
    assists:       totalAssists,
    own_goals:     totalOwnGoals,
    matches_played: matchesPlayed,
    recent_matches: recentMatches,
  } as PlayerProfileData
}
