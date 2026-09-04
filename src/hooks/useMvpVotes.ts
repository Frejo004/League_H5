import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface MvpResult {
  player_id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  team_id: string
  team_name: string
  team_color: string
  votes: number
  player_slug?: string | null
}

export interface MvpVoteWithPlayer {
  id: string
  match_id: string
  player_id: string
  voted_by: string
  created_at: string
  players?: {
    id: string
    first_name: string
    last_name: string
    team_id: string
    teams?: { id: string; name: string; color: string } | null
  } | null
}

// Helper pour grouper les votes par match et déterminer le(s) gagnant(s)
export function getMvpWinnersByMatch(votes: Array<{ match_id: string; player_id: string }>) {
  const votesByMatch = new Map<string, Map<string, number>>()
  for (const v of votes) {
    if (!votesByMatch.has(v.match_id)) votesByMatch.set(v.match_id, new Map())
    const mv = votesByMatch.get(v.match_id)!
    mv.set(v.player_id, (mv.get(v.player_id) ?? 0) + 1)
  }

  const winnersByMatch = new Map<string, string[]>()
  for (const [matchId, matchVotes] of votesByMatch) {
    if (matchVotes.size === 0) continue
    const maxVotes = Math.max(...matchVotes.values())
    const winners = [...matchVotes.entries()]
      .filter((entry) => entry[1] === maxVotes)
      .map(([pId]) => pId)
    winnersByMatch.set(matchId, winners)
  }
  return { votesByMatch, winnersByMatch }
}

// ── Votes for a single match ──────────────────────────────────────────────────

export function useMvpVotes(matchId?: string) {
  return useQuery<MvpVoteWithPlayer[]>({
    queryKey: ['mvp_votes', matchId],
    enabled: !!matchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mvp_votes')
        .select('*, players(id, first_name, last_name, team_id, teams!players_team_id_fkey(id, name, color))')
        .eq('match_id', matchId!)
      if (error) throw error
      return (data ?? []) as unknown as MvpVoteWithPlayer[]
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
          { match_id: matchId, player_id: playerId, voted_by: votedBy } as unknown as never[],
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
      // Invalide aussi le classement MVP saison et les profils joueurs
      qc.invalidateQueries({ queryKey: ['mvp_ranking'] })
      qc.invalidateQueries({ queryKey: ['player_mvp'] })
    },
  })
}

// ── MVP data for a single player (profile page) ──────────────────────────────

export interface PlayerMvpData {
  total_mvp: number   // nombre de fois élu homme du match
  mvp_matches: Array<{
    match_id: string
    match_slug: string
    matchday: number
    played_at: string | null
    home_team_name: string
    away_team_name: string
    home_score: number
    away_score: number
  }>
}

export function usePlayerMvp(playerId?: string, seasonId?: string) {
  return useQuery({
    queryKey: ['player_mvp', playerId, seasonId],
    enabled: !!playerId && !!seasonId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      // 1. Matchs terminés de la saison
      const { data: matchData, error: matchErr } = await supabase
        .from('matches')
        .select(`
          id, slug, matchday, played_at, home_score, away_score,
          home_team:teams!home_team_id(name),
          away_team:teams!away_team_id(name)
        `)
        .eq('season_id', seasonId!)
        .eq('status', 'completed')
      if (matchErr) throw matchErr
      const matchDataList = (matchData ?? []) as any[]
      const matchIds = matchDataList.map(m => m.id)
      if (matchIds.length === 0) return { total_mvp: 0, mvp_matches: [] }

      // 2. Tous les votes de ces matchs
      const { data: votes, error: votesErr } = await supabase
        .from('mvp_votes')
        .select('match_id, player_id')
        .in('match_id', matchIds)
      if (votesErr) throw votesErr
      const votesList = (votes ?? []) as any[]
      if (!votesList.length) return { total_mvp: 0, mvp_matches: [] }

      // 3. Pour chaque match, trouver le MVP (ou co-MVP en cas d'égalité)
      const votesByMatch = new Map<string, Map<string, number>>()
      for (const v of votesList) {
        if (!votesByMatch.has(v.match_id)) votesByMatch.set(v.match_id, new Map())
        const mv = votesByMatch.get(v.match_id)!
        mv.set(v.player_id, (mv.get(v.player_id) ?? 0) + 1)
      }

      // 4. Matchs où ce joueur est MVP
      const mvpMatchIds = new Set<string>()
      for (const [matchId, matchVotes] of votesByMatch) {
        if (matchVotes.size === 0) continue
        const maxVotes = Math.max(...matchVotes.values())
        const winners = [...matchVotes.entries()]
          .filter((entry) => entry[1] === maxVotes)
          .map(([pId]) => pId)

        if (winners.includes(playerId!)) {
          mvpMatchIds.add(matchId)
        }
      }

      const mvpMatches = matchDataList
        .filter(m => mvpMatchIds.has(m.id))
        .map(m => ({
          match_id:       m.id,
          match_slug:     m.slug,
          matchday:       m.matchday,
          played_at:      m.played_at,
          home_team_name: (m.home_team as unknown as { name: string })?.name ?? '—',
          away_team_name: (m.away_team as unknown as { name: string })?.name ?? '—',
          home_score:     m.home_score ?? 0,
          away_score:     m.away_score ?? 0,
        }))
        .sort((a, b) => new Date(b.played_at ?? 0).getTime() - new Date(a.played_at ?? 0).getTime())

      return {
        total_mvp:   mvpMatchIds.size,
        mvp_matches: mvpMatches,
      } as PlayerMvpData
    },
  })
}

// Classement MVP : Tri par nombre de titres MVP obtenus, avec bris d'égalité par le total de votes reçus
export function useMvpRanking(seasonId?: string) {
  return useQuery({
    queryKey: ['mvp_ranking', seasonId],
    enabled: !!seasonId,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      // 1. Matchs terminés de la saison
      const { data: matchData, error: matchErr } = await supabase
        .from('matches')
        .select('id')
        .eq('season_id', seasonId!)
        .eq('status', 'completed')
      if (matchErr) throw matchErr
      const matchDataList = (matchData ?? []) as any[]
      const matchIds = matchDataList.map(m => m.id)
      if (matchIds.length === 0) return []

      // 2. Tous les votes de ces matchs avec infos joueur/équipe
      const { data: votes, error: votesErr } = await supabase
        .from('mvp_votes')
        .select(`
          match_id,
          player_id,
          players(id, first_name, last_name, slug, team_id, user_id, avatar_url, teams!players_team_id_fkey(id, name, color))
        `)
        .in('match_id', matchIds)
      if (votesErr) throw votesErr
      const votesList = (votes ?? []) as any[]
      if (!votesList.length) return []

      // 3. Calculer pour chaque match qui est MVP (ou co-MVP)
      const votesByMatch = new Map<string, Map<string, number>>()
      for (const v of votesList) {
        if (!votesByMatch.has(v.match_id)) votesByMatch.set(v.match_id, new Map())
        const mv = votesByMatch.get(v.match_id)!
        mv.set(v.player_id, (mv.get(v.player_id) ?? 0) + 1)
      }

      const mvpCountByPlayer = new Map<string, number>()
      const totalVotesByPlayer = new Map<string, number>()

      for (const matchVotes of votesByMatch.values()) {
        if (matchVotes.size === 0) continue
        const maxVotes = Math.max(...matchVotes.values())
        const winners = [...matchVotes.entries()]
          .filter((entry) => entry[1] === maxVotes)
          .map(([pId]) => pId)

        for (const pId of winners) {
          mvpCountByPlayer.set(pId, (mvpCountByPlayer.get(pId) ?? 0) + 1)
        }

        // Cumuler aussi les votes bruts pour le bris d'égalité
        for (const [pId, vCount] of matchVotes) {
          totalVotesByPlayer.set(pId, (totalVotesByPlayer.get(pId) ?? 0) + vCount)
        }
      }

      // 4. Construire le classement
      const seen = new Set<string>()
      const ranking: Array<MvpResult & { mvp_titles: number }> = []

      // Récupérer les avatars depuis profiles pour les joueurs avec user_id
      const allPlayers = votesList
        .map(v => v.players as unknown as {
          id: string; first_name: string; last_name: string; slug?: string
          team_id: string; user_id: string | null; avatar_url: string | null
          teams: { id: string; name: string; color: string } | null
        } | null)
        .filter(Boolean)

      const userIds = [...new Set(allPlayers.map(p => (p as any).user_id).filter(Boolean) as string[])]
      const profilesMap = new Map<string, string | null>()
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', userIds)
        // @ts-expect-error Supabase select typing inference issue
        for (const pr of (profiles ?? [])) profilesMap.set(pr.id, pr.avatar_url)
      }

      for (const v of votesList) {
        if (seen.has(v.player_id)) continue
        seen.add(v.player_id)

        const p = v.players as unknown as {
          id: string
          first_name: string
          last_name: string
          slug?: string
          team_id: string
          user_id: string | null
          avatar_url: string | null
          teams: { id: string; name: string; color: string } | null
        } | null
        if (!p) continue

        const avatar = (p.user_id ? profilesMap.get(p.user_id) : null) ?? p.avatar_url ?? null

        ranking.push({
          player_id:   p.id,
          first_name:  p.first_name,
          last_name:   p.last_name,
          avatar_url:  avatar,
          team_id:     p.team_id,
          team_name:   p.teams?.name  ?? '—',
          team_color:  p.teams?.color ?? '#16a34a',
          votes:       totalVotesByPlayer.get(p.id) ?? 0,
          mvp_titles:  mvpCountByPlayer.get(p.id) ?? 0,
          player_slug: p.slug ?? null,
        })
      }

      // Tri : Titres de Joueur du Match d'abord, puis Votes cumulés
      return ranking.sort((a, b) => {
        if (b.mvp_titles !== a.mvp_titles) {
          return b.mvp_titles - a.mvp_titles
        }
        return b.votes - a.votes
      })
    },
  })
}
