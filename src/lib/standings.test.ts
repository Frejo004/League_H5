import { describe, it, expect } from 'vitest'
import { computeFilteredStandings } from './standings'
import type { StandingRow } from '@/hooks/useStandings'
import type { MatchWithTeams } from '@/types/database'

function createMockStandingRow(overrides: Partial<StandingRow>): StandingRow {
  return {
    team_id: 'team-1',
    team_name: 'Team 1',
    team_color: '#ff0000',
    team_logo: null,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goals_for: 0,
    goals_against: 0,
    goal_diff: 0,
    points: 0,
    form: [],
    ...overrides,
  }
}

function createMockMatch(overrides: Partial<MatchWithTeams>): MatchWithTeams {
  return {
    id: 'm-1',
    season_id: 's-1',
    home_team_id: 'team-1',
    away_team_id: 'team-2',
    matchday: 1,
    status: 'completed',
    home_score: 2,
    away_score: 1,
    scheduled_at: '2026-01-01T10:00:00Z',
    played_at: '2026-01-01T10:00:00Z',
    events_reporter_id: null,
    video_reporter_id: null,
    created_at: '2026-01-01T09:00:00Z',
    home_team: { id: 'team-1', name: 'Team 1', color: '#ff0000', logo_url: null, captain_id: null },
    away_team: { id: 'team-2', name: 'Team 2', color: '#0000ff', logo_url: null, captain_id: null },
    ...overrides,
  } as MatchWithTeams
}

describe('computeFilteredStandings', () => {
  it('returns untouched standings when filter is "all"', () => {
    const standings = [createMockStandingRow({ team_id: 't1', points: 10 })]
    const matches = [createMockMatch({ home_team_id: 't1', away_team_id: 't2', home_score: 3, away_score: 0 })]

    const result = computeFilteredStandings(standings, matches, 'all')
    expect(result).toBe(standings)
  })

  it('returns original input when standings or matches is undefined', () => {
    expect(computeFilteredStandings(undefined, [], 'home')).toBeUndefined()
    expect(computeFilteredStandings([], undefined, 'home')).toEqual([])
  })

  it('calculates home matches correctly (wins, draws, losses, points, goal diff)', () => {
    const standings = [
      createMockStandingRow({ team_id: 'team-a', team_name: 'Team A' }),
      createMockStandingRow({ team_id: 'team-b', team_name: 'Team B' }),
    ]

    const matches = [
      // Match 1: Team A at home beats Team B 3-1
      createMockMatch({
        id: 'm1',
        matchday: 1,
        home_team_id: 'team-a',
        away_team_id: 'team-b',
        home_score: 3,
        away_score: 1,
        status: 'completed',
      }),
      // Match 2: Team B at home draws with Team A 2-2 (should not count for Team A in "home" filter)
      createMockMatch({
        id: 'm2',
        matchday: 2,
        home_team_id: 'team-b',
        away_team_id: 'team-a',
        home_score: 2,
        away_score: 2,
        status: 'completed',
      }),
      // Match 3: Team A at home draws with Team C 0-0
      createMockMatch({
        id: 'm3',
        matchday: 3,
        home_team_id: 'team-a',
        away_team_id: 'team-c',
        home_score: 0,
        away_score: 0,
        status: 'completed',
      }),
    ]

    const result = computeFilteredStandings(standings, matches, 'home')!
    expect(result).toBeDefined()

    const teamA = result.find(r => r.team_id === 'team-a')!
    expect(teamA.played).toBe(2)
    expect(teamA.won).toBe(1)
    expect(teamA.drawn).toBe(1)
    expect(teamA.lost).toBe(0)
    expect(teamA.points).toBe(4)
    expect(teamA.goals_for).toBe(3)
    expect(teamA.goals_against).toBe(1)
    expect(teamA.goal_diff).toBe(2)
    // Form should have most recent match first (m3: D, m1: W) -> ['D', 'W']
    expect(teamA.form).toEqual(['D', 'W'])

    const teamB = result.find(r => r.team_id === 'team-b')!
    expect(teamB.played).toBe(1)
    expect(teamB.drawn).toBe(1)
    expect(teamB.points).toBe(1)
  })

  it('calculates away matches correctly', () => {
    const standings = [
      createMockStandingRow({ team_id: 'team-a', team_name: 'Team A' }),
      createMockStandingRow({ team_id: 'team-b', team_name: 'Team B' }),
    ]

    const matches = [
      // Match 1: Team B plays away at Team A and loses 1-3
      createMockMatch({
        id: 'm1',
        matchday: 1,
        home_team_id: 'team-a',
        away_team_id: 'team-b',
        home_score: 3,
        away_score: 1,
        status: 'completed',
      }),
    ]

    const result = computeFilteredStandings(standings, matches, 'away')!
    const teamB = result.find(r => r.team_id === 'team-b')!
    expect(teamB.played).toBe(1)
    expect(teamB.won).toBe(0)
    expect(teamB.drawn).toBe(0)
    expect(teamB.lost).toBe(1)
    expect(teamB.points).toBe(0)
    expect(teamB.goals_for).toBe(1)
    expect(teamB.goals_against).toBe(3)
    expect(teamB.goal_diff).toBe(-2)
    expect(teamB.form).toEqual(['L'])
  })

  it('sorts standings by points, then goal_diff, then goals_for', () => {
    const standings = [
      createMockStandingRow({ team_id: 'team-1', team_name: 'T1' }),
      createMockStandingRow({ team_id: 'team-2', team_name: 'T2' }),
      createMockStandingRow({ team_id: 'team-3', team_name: 'T3' }),
    ]

    const matches = [
      // T1 wins 1-0 (3 pts, +1 diff, 1 gf)
      createMockMatch({
        id: 'm1',
        matchday: 1,
        home_team_id: 'team-1',
        away_team_id: 'team-other',
        home_score: 1,
        away_score: 0,
        status: 'completed',
      }),
      // T2 wins 4-2 (3 pts, +2 diff, 4 gf)
      createMockMatch({
        id: 'm2',
        matchday: 1,
        home_team_id: 'team-2',
        away_team_id: 'team-other',
        home_score: 4,
        away_score: 2,
        status: 'completed',
      }),
      // T3 wins 3-1 (3 pts, +2 diff, 3 gf)
      createMockMatch({
        id: 'm3',
        matchday: 1,
        home_team_id: 'team-3',
        away_team_id: 'team-other',
        home_score: 3,
        away_score: 1,
        status: 'completed',
      }),
    ]

    const result = computeFilteredStandings(standings, matches, 'home')!

    // T2 has +2 diff, 4 gf -> 1st
    // T3 has +2 diff, 3 gf -> 2nd
    // T1 has +1 diff, 1 gf -> 3rd
    expect(result[0].team_id).toBe('team-2')
    expect(result[1].team_id).toBe('team-3')
    expect(result[2].team_id).toBe('team-1')
  })

  it('ignores matches that are not completed or have null scores', () => {
    const standings = [createMockStandingRow({ team_id: 'team-1' })]
    const matches = [
      createMockMatch({
        id: 'm1',
        home_team_id: 'team-1',
        away_team_id: 'team-2',
        status: 'scheduled',
        home_score: null,
        away_score: null,
      }),
      createMockMatch({
        id: 'm2',
        home_team_id: 'team-1',
        away_team_id: 'team-2',
        status: 'live',
        home_score: 1,
        away_score: 0,
      }),
    ]

    const result = computeFilteredStandings(standings, matches, 'home')!
    expect(result[0].played).toBe(0)
    expect(result[0].points).toBe(0)
  })
})
