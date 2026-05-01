import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface StandingRow {
  team_id: string
  team_name: string
  team_color: string
  team_logo: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_diff: number
  points: number
}

export function useStandings(seasonId?: string) {
  return useQuery({
    queryKey: ['standings', seasonId],
    enabled: !!seasonId,
    queryFn: async () => {
      // Fetch settings for point values
      const [matchesRes, settingsRes] = await Promise.all([
        supabase
          .from('matches')
          .select(`
            id, home_team_id, away_team_id,
            home_score, away_score, status,
            home_team:teams!home_team_id(id, name, color, logo_url),
            away_team:teams!away_team_id(id, name, color, logo_url)
          `)
          .eq('season_id', seasonId!)
          .eq('status', 'completed'),
        supabase
          .from('settings')
          .select('points_win, points_draw, points_loss')
          .eq('season_id', seasonId!)
          .single(),
      ])

      if (matchesRes.error) throw matchesRes.error

      const pts = {
        win: settingsRes.data?.points_win ?? 3,
        draw: settingsRes.data?.points_draw ?? 1,
        loss: settingsRes.data?.points_loss ?? 0,
      }

      const table = new Map<string, StandingRow>()

      function ensureTeam(id: string, name: string, color: string, logo: string | null) {
        if (!table.has(id)) {
          table.set(id, {
            team_id: id,
            team_name: name,
            team_color: color,
            team_logo: logo,
            played: 0, won: 0, drawn: 0, lost: 0,
            goals_for: 0, goals_against: 0, goal_diff: 0, points: 0,
          })
        }
        return table.get(id)!
      }

      for (const match of matchesRes.data ?? []) {
        if (match.home_score === null || match.away_score === null) continue

        const home = match.home_team as { id: string; name: string; color: string; logo_url: string | null }
        const away = match.away_team as { id: string; name: string; color: string; logo_url: string | null }

        const h = ensureTeam(home.id, home.name, home.color, home.logo_url)
        const a = ensureTeam(away.id, away.name, away.color, away.logo_url)

        h.played++
        a.played++
        h.goals_for += match.home_score
        h.goals_against += match.away_score
        a.goals_for += match.away_score
        a.goals_against += match.home_score

        if (match.home_score > match.away_score) {
          h.won++; h.points += pts.win
          a.lost++; a.points += pts.loss
        } else if (match.home_score < match.away_score) {
          a.won++; a.points += pts.win
          h.lost++; h.points += pts.loss
        } else {
          h.drawn++; h.points += pts.draw
          a.drawn++; a.points += pts.draw
        }
      }

      // Compute goal diff and sort
      const rows = Array.from(table.values()).map(r => ({
        ...r,
        goal_diff: r.goals_for - r.goals_against,
      }))

      rows.sort((a, b) =>
        b.points - a.points ||
        b.goal_diff - a.goal_diff ||
        b.goals_for - a.goals_for ||
        a.team_name.localeCompare(b.team_name)
      )

      return rows
    },
  })
}
