import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ScorerRow } from './useScorers'
import type { StandingRow } from './useStandings'

export interface PalmaresData {
  champion: StandingRow | null
  topScorer: ScorerRow | null
  topAssister: ScorerRow | null
  totalGoals: number
  totalMatches: number
  standings: StandingRow[]
}

export function usePalmaresData(seasonId?: string) {
  return useQuery({
    queryKey: ['palmares', seasonId],
    enabled: !!seasonId,
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<PalmaresData> => {
      const [standingsRes, scorersRes, matchesRes] = await Promise.all([
        supabase.rpc('get_standings', { p_season_id: seasonId! }),
        supabase.rpc('get_scorers',   { p_season_id: seasonId! }),
        supabase
          .from('matches')
          .select('id, status, home_score, away_score')
          .eq('season_id', seasonId!)
          .eq('status', 'completed'),
      ])

      const standings: StandingRow[] = (standingsRes.data ?? []).map(row => ({
        ...row,
        team_logo: row.team_logo ?? null,
        form: row.form ? (row.form.split(',') as Array<'W' | 'D' | 'L'>) : [],
      }))

      const scorers: ScorerRow[] = (scorersRes.data ?? []) as ScorerRow[]
      const matches = matchesRes.data ?? []

      const totalGoals = matches.reduce(
        (sum, m) => sum + (m.home_score ?? 0) + (m.away_score ?? 0), 0
      )

      const topScorer   = scorers.filter(s => s.goals > 0).sort((a, b) => b.goals - a.goals)[0] ?? null
      const topAssister = scorers.filter(s => s.assists > 0).sort((a, b) => b.assists - a.assists)[0] ?? null

      return {
        champion:     standings[0] ?? null,
        topScorer,
        topAssister,
        totalGoals,
        totalMatches: matches.length,
        standings,
      }
    },
  })
}
