import { useMemo } from 'react'
import { useStandings, StandingRow } from './useStandings'

export interface VirtualStandingRow extends StandingRow {
  is_live?: boolean
  position_change?: number
}

/**
 * Calcule le classement "virtuel" en intégrant le score du match live actuel
 */
export function useLiveStandings(
  seasonId: string | undefined, 
  matchId: string, 
  homeId: string, 
  awayId: string, 
  homeScore: number, 
  awayScore: number,
  status: string
) {
  const { data: standings, isLoading } = useStandings(seasonId)

  const virtualStandings = useMemo(() => {
    if (!standings || standings.length === 0) return []
    if (status !== 'live') return standings

    // 1. Cloner le classement actuel
    const virtual = [...standings].map(s => ({ ...s })) as VirtualStandingRow[]

    // 2. Trouver les deux équipes concernées
    const homeIdx = virtual.findIndex(s => s.team_id === homeId)
    const awayIdx = virtual.findIndex(s => s.team_id === awayId)

    if (homeIdx !== -1 && awayIdx !== -1) {
      const home = virtual[homeIdx]
      const away = virtual[awayIdx]

      // Marquer ces lignes comme "live" pour le style
      home.is_live = true
      away.is_live = true

      // Mettre à jour les stats selon le score actuel
      home.played += 1
      away.played += 1
      home.goals_for += homeScore
      home.goals_against += awayScore
      away.goals_for += awayScore
      away.goals_against += homeScore
      home.goal_diff = home.goals_for - home.goals_against
      away.goal_diff = away.goals_for - away.goals_against

      if (homeScore > awayScore) {
        home.won += 1; home.points += 3
        away.lost += 1
      } else if (homeScore < awayScore) {
        away.won += 1; away.points += 3
        home.lost += 1
      } else {
        home.drawn += 1; home.points += 1
        away.drawn += 1; away.points += 1
      }
    }

    // 3. Trier le classement virtuel (Points > Diff > Buts Pour)
    const sortedVirtual = [...virtual].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff
      return b.goals_for - a.goals_for
    })

    // 4. Calculer le changement de position
    // On compare l'index dans 'standings' (original) avec l'index dans 'sortedVirtual'
    return sortedVirtual.map((row, newIdx) => {
      const oldIdx = standings.findIndex(s => s.team_id === row.team_id)
      return {
        ...row,
        position_change: oldIdx - newIdx // > 0 si on monte (ex: 5ème -> 3ème = 2)
      }
    })

  }, [standings, homeId, awayId, homeScore, awayScore, status])

  return { data: virtualStandings, isLoading }
}
