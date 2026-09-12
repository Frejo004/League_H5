import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database, MatchStatus } from '@/types/database'
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

type StandingsRpcRow = Database['public']['Functions']['get_standings']['Returns'][number]
type ScorersRpcRow = Database['public']['Functions']['get_scorers']['Returns'][number]

interface CompletedMatchRow {
  id: string
  status: MatchStatus
  home_score: number | null
  away_score: number | null
}

// Workaround : comme pour les jointures dans useTransfers.ts, l'inférence de
// type de supabase-js s'effondre sur `never` pour les appels rpc() dans ce
// fichier (profondeur d'instanciation du type Database). On type
// manuellement le retour via un wrapper `unknown` plutôt que `any`.
type TypedRpc = <T>(
  fn: string,
  args: Record<string, unknown>
) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
const rpc = supabase.rpc as unknown as TypedRpc

export function usePalmaresData(seasonId?: string) {
  return useQuery({
    queryKey: ['palmares', seasonId],
    enabled: !!seasonId,
    staleTime: 1000 * 60 * 30,
    queryFn: async (): Promise<PalmaresData> => {
      const [standingsRes, scorersRes, matchesRes] = await Promise.all([
        rpc<StandingsRpcRow>('get_standings', { p_season_id: seasonId! }),
        rpc<ScorersRpcRow>('get_scorers',   { p_season_id: seasonId! }),
        supabase
          .from('matches')
          .select('id, status, home_score, away_score')
          .eq('season_id', seasonId!)
          .eq('status', 'completed'),
      ])

      const standings: StandingRow[] = (standingsRes.data ?? []).map((row) => ({
        ...row,
        team_logo: row.team_logo ?? null,
        form: row.form ? (row.form.split(',') as Array<'W' | 'D' | 'L'>) : [],
      }))

      const scorers: ScorerRow[] = (scorersRes.data ?? []) as unknown as ScorerRow[]
      const matches = (matchesRes.data ?? []) as unknown as CompletedMatchRow[]

      const totalGoals = matches.reduce(
        (sum, m) => sum + (Number(m.home_score) || 0) + (Number(m.away_score) || 0), 0
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
