import type { StandingRow } from '@/hooks/useStandings'
import type { MatchWithTeams } from '@/types/database'

export type FilterType = 'all' | 'home' | 'away'

/**
 * Calcule le classement filtré (Général, Domicile, Extérieur)
 * avec recalcul des points, buts, différence de buts et forme chronologique.
 */
export function computeFilteredStandings(
  standings: StandingRow[] | undefined,
  matches: MatchWithTeams[] | undefined,
  filter: FilterType
): StandingRow[] | undefined {
  if (filter === 'all' || !matches || !standings) return standings

  const statsMap = new Map<string, {
    played: number
    won: number
    drawn: number
    lost: number
    goals_for: number
    goals_against: number
    points: number
    form: Array<'W' | 'D' | 'L'>
  }>()

  for (const row of standings) {
    statsMap.set(row.team_id, {
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      points: 0,
      form: [],
    })
  }

  // Trier les matchs par journée pour calculer la forme dans l'ordre chronologique
  const sortedMatches = [...matches].sort((a, b) => a.matchday - b.matchday)

  for (const m of sortedMatches) {
    if (m.status !== 'completed' || m.home_score === null || m.away_score === null) continue
    const processTeam = (teamId: string, gf: number, ga: number) => {
      const s = statsMap.get(teamId)
      if (!s) return
      s.played++
      s.goals_for += gf
      s.goals_against += ga
      let res: 'W' | 'D' | 'L'
      if (gf > ga) {
        s.won++
        s.points += 3
        res = 'W'
      } else if (gf === ga) {
        s.drawn++
        s.points += 1
        res = 'D'
      } else {
        s.lost++
        res = 'L'
      }
      s.form.push(res)
    }
    if (filter === 'home') processTeam(m.home_team_id, m.home_score, m.away_score)
    if (filter === 'away') processTeam(m.away_team_id, m.away_score, m.home_score)
  }

  return standings
    .map(row => {
      const s = statsMap.get(row.team_id)!
      // Inverser pour avoir le match le plus récent en premier
      const reversedForm = [...s.form].reverse()
      return {
        ...row,
        ...s,
        form: reversedForm,
        goal_diff: s.goals_for - s.goals_against,
      }
    })
    .sort((a, b) => b.points - a.points || b.goal_diff - a.goal_diff || b.goals_for - a.goals_for)
}
