import { supabase } from '@/lib/supabase'
import type { Match, MatchStatus } from '@/types/database'

// ── Algorithme round-robin aller-retour ───────────────────────────────────────
// Génère tous les matchs aller + retour pour n équipes.
// Retourne un tableau de journées, chaque journée contenant des paires [home, away].
export function generateRoundRobin(teamIds: string[]): Array<Array<[string, string]>> {
  const n = teamIds.length
  const teams = [...teamIds]

  // Si nombre impair, ajouter un "bye" fictif
  if (n % 2 !== 0) teams.push('BYE')
  const total = teams.length
  const rounds: Array<Array<[string, string]>> = []

  // Aller
  for (let round = 0; round < total - 1; round++) {
    const pairs: Array<[string, string]> = []
    for (let i = 0; i < total / 2; i++) {
      const home = teams[i]
      const away = teams[total - 1 - i]
      if (home !== 'BYE' && away !== 'BYE') {
        pairs.push([home, away])
      }
    }
    rounds.push(pairs)
    // Rotation : fixe le premier, tourne les autres
    teams.splice(1, 0, teams.pop()!)
  }

  // Retour : inverser domicile/extérieur
  const returnRounds = rounds.map(r => r.map(([h, a]) => [a, h] as [string, string]))
  return [...rounds, ...returnRounds]
}

export type SchedulableMatch = Pick<
  Match,
  'id' | 'home_team_id' | 'away_team_id' | 'matchday' | 'scheduled_at' | 'played_at' | 'status' | 'created_at'
>

export const SCHEDULABLE_MATCH_SELECT = 'id,home_team_id,away_team_id,matchday,scheduled_at,played_at,status,created_at'

export type MatchdayBalanceOptions = {
  requireTwoMatches?: boolean
  keepCancelledSeparate?: boolean
}

export function getRoundRobinRoundCount(teamCount: number) {
  if (teamCount < 2) return 0
  return (teamCount % 2 === 0 ? teamCount - 1 : teamCount) * 2
}

export function fixtureKey(homeTeamId: string, awayTeamId: string) {
  return `${homeTeamId}:${awayTeamId}`
}

function compareNullableDate(a?: string | null, b?: string | null) {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return new Date(a).getTime() - new Date(b).getTime()
}

export function compareMatchesForScheduling(a: SchedulableMatch, b: SchedulableMatch) {
  const statusPriority: Record<MatchStatus, number> = {
    completed: 0,
    live: 1,
    scheduled: 2,
    cancelled: 3,
  }

  return (
    statusPriority[a.status] - statusPriority[b.status] ||
    compareNullableDate(a.played_at ?? a.scheduled_at, b.played_at ?? b.scheduled_at) ||
    a.matchday - b.matchday ||
    compareNullableDate(a.created_at, b.created_at)
  )
}


function hasDuplicateTeamInMatchday(dayMatches: SchedulableMatch[]) {
  const teamIds = dayMatches.flatMap(match => [match.home_team_id, match.away_team_id])
  return new Set(teamIds).size !== teamIds.length
}

function hasValidMatchdays(matches: SchedulableMatch[], requireTwoMatches = false) {
  const matchdayNumbers = [...new Set(matches.map(match => match.matchday))].sort((a, b) => a - b)
  if (matchdayNumbers.some((matchday, index) => matchday !== index + 1)) return false

  return matchdayNumbers.every(matchday => {
    const dayMatches = matches.filter(match => match.matchday === matchday)
    const cancelledMatches = dayMatches.filter(match => match.status === 'cancelled')

    if (requireTwoMatches) {
      return dayMatches.length === 2 && cancelledMatches.length === 0 && !hasDuplicateTeamInMatchday(dayMatches)
    }

    if (cancelledMatches.length > 0) {
      return dayMatches.length === 1
    }

    return dayMatches.length <= 2 && !hasDuplicateTeamInMatchday(dayMatches)
  })
}

function fixturePairKey(teamId1: string, teamId2: string) {
  return [teamId1, teamId2].sort().join(':')
}

export function buildBalancedMatchdayUpdates(matches: SchedulableMatch[], keepCancelledSeparate = true) {
  // 1. Split matches into fixed (completed/live), variable (scheduled/cancelled), and cancelled
  const fixedMatches = matches.filter(match => match.status === 'completed' || match.status === 'live')
    .sort(compareMatchesForScheduling)
  const variableMatches = matches
    .filter(match => match.status !== 'completed' && match.status !== 'live')
    .filter(match => !keepCancelledSeparate || match.status !== 'cancelled')
    .sort(compareMatchesForScheduling)

  // 2. Initialize matchdays structure
  const allMatchdays: SchedulableMatch[][] = []

  // 3. Function to assign matches to days sequentially
  function assignMatches(matchesToAssign: SchedulableMatch[]) {
    const remaining = [...matchesToAssign]

    while (remaining.length > 0) {
      // Get or create current day
      const currentDayIndex = allMatchdays.length
      let dayMatches = allMatchdays[currentDayIndex]
      if (!dayMatches) {
        dayMatches = []
        allMatchdays.push(dayMatches)
      }

      const usedTeams = new Set<string>()
      dayMatches.forEach(m => {
        usedTeams.add(m.home_team_id)
        usedTeams.add(m.away_team_id)
      })

      // Try to add matches to current day
      for (let i = remaining.length - 1; i >= 0; i--) {
        const match = remaining[i]
        if (
          dayMatches.length < 2 &&
          !usedTeams.has(match.home_team_id) &&
          !usedTeams.has(match.away_team_id)
        ) {
          dayMatches.push(match)
          usedTeams.add(match.home_team_id)
          usedTeams.add(match.away_team_id)
          remaining.splice(i, 1)
        }
      }

      // If no matches added, start a new day
      if (dayMatches.length === allMatchdays[currentDayIndex]?.length) {
        allMatchdays.push([])
      }
    }
  }

  // 4. First assign fixed matches (completed/live)
  assignMatches(fixedMatches)

  // 5. Split variable matches into aller and retour phases
  const fixturePairs = new Map<string, SchedulableMatch[]>()
  for (const match of variableMatches) {
    const key = fixturePairKey(match.home_team_id, match.away_team_id)
    fixturePairs.set(key, [...(fixturePairs.get(key) ?? []), match])
  }

  const allerMatches: SchedulableMatch[] = []
  const retourMatches: SchedulableMatch[] = []
  for (const pair of fixturePairs.values()) {
    if (pair.length >= 1) allerMatches.push(pair[0])
    if (pair.length >= 2) retourMatches.push(pair[1])
  }

  // 6. Assign aller then retour
  assignMatches(allerMatches)
  assignMatches(retourMatches)

  // 7. Add cancelled matches
  if (keepCancelledSeparate) {
    const cancelledMatches = matches
      .filter(match => match.status === 'cancelled')
      .sort(compareMatchesForScheduling)

    for (const match of cancelledMatches) {
      allMatchdays.push([match])
    }
  }

  // 8. Filter out empty days and generate updates
  const nonEmptyMatchdays = allMatchdays.filter(day => day.length > 0)
  return nonEmptyMatchdays.flatMap((dayMatches, index) => {
    const matchday = index + 1
    return dayMatches
      .filter(match => match.matchday !== matchday)
      .map(match => ({ id: match.id, matchday }))
  })
}

export async function applyBalancedMatchdays(
  seasonId: string,
  knownMatches?: SchedulableMatch[],
  options: MatchdayBalanceOptions = {}
) {
  let matchesToBalance = knownMatches

  if (!matchesToBalance) {
    const { data, error } = await supabase
      .from('matches')
      .select(SCHEDULABLE_MATCH_SELECT)
      .eq('season_id', seasonId)
    if (error) throw error
    matchesToBalance = (data ?? []) as SchedulableMatch[]
  }

  if (hasValidMatchdays(matchesToBalance, options.requireTwoMatches)) return

  const matchdayUpdates = buildBalancedMatchdayUpdates(
    matchesToBalance,
    options.keepCancelledSeparate ?? true
  )
  if (matchdayUpdates.length === 0) return

  const updateResults = await Promise.all(
    matchdayUpdates.map(update =>
      supabase
        .from('matches')
        // @ts-expect-error Supabase update typing inference issue
        .update({ matchday: update.matchday })
        .eq('id', update.id)
    )
  )

  const updateError = updateResults.find(result => result.error)?.error
  if (updateError) throw updateError
}
