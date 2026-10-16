import { describe, it, expect } from 'vitest'
import {
  generateRoundRobin,
  getRoundRobinRoundCount,
  fixtureKey,
  compareMatchesForScheduling,
  type SchedulableMatch,
} from './matchScheduling'

describe('matchScheduling', () => {
  describe('getRoundRobinRoundCount', () => {
    it('returns 0 for less than 2 teams', () => {
      expect(getRoundRobinRoundCount(0)).toBe(0)
      expect(getRoundRobinRoundCount(1)).toBe(0)
    })

    it('returns correct round count for even number of teams', () => {
      // 4 teams -> (4 - 1) * 2 = 6 rounds
      expect(getRoundRobinRoundCount(4)).toBe(6)
      // 6 teams -> (6 - 1) * 2 = 10 rounds
      expect(getRoundRobinRoundCount(6)).toBe(10)
    })

    it('returns correct round count for odd number of teams', () => {
      // 3 teams -> 3 * 2 = 6 rounds
      expect(getRoundRobinRoundCount(3)).toBe(6)
      // 5 teams -> 5 * 2 = 10 rounds
      expect(getRoundRobinRoundCount(5)).toBe(10)
    })
  })

  describe('fixtureKey', () => {
    it('generates a consistent key for home and away teams', () => {
      expect(fixtureKey('team-1', 'team-2')).toBe('team-1:team-2')
    })
  })

  describe('generateRoundRobin', () => {
    it('generates a valid double round-robin for 4 teams', () => {
      const teams = ['A', 'B', 'C', 'D']
      const schedule = generateRoundRobin(teams)

      // 6 rounds total (3 aller, 3 retour)
      expect(schedule.length).toBe(6)

      // Count matches
      const allMatches = schedule.flat()
      expect(allMatches.length).toBe(12) // 4 * 3 = 12 matches total

      // Check each pair meets twice (once home, once away)
      const fixtures = new Set<string>()
      for (const [home, away] of allMatches) {
        expect(home).not.toBe(away)
        const key = fixtureKey(home, away)
        expect(fixtures.has(key)).toBe(false)
        fixtures.add(key)
      }

      // Check reverse fixtures exist
      for (let i = 0; i < teams.length; i++) {
        for (let j = 0; j < teams.length; j++) {
          if (i !== j) {
            expect(fixtures.has(fixtureKey(teams[i], teams[j]))).toBe(true)
          }
        }
      }
    })

    it('handles odd number of teams by generating byes cleanly', () => {
      const teams = ['A', 'B', 'C']
      const schedule = generateRoundRobin(teams)

      // 6 rounds total
      expect(schedule.length).toBe(6)

      // Each round has exactly 1 match (1 team is resting)
      for (const round of schedule) {
        expect(round.length).toBe(1)
        expect(round[0][0]).not.toBe('BYE')
        expect(round[0][1]).not.toBe('BYE')
      }

      // Total matches: 3 * 2 = 6 matches
      const allMatches = schedule.flat()
      expect(allMatches.length).toBe(6)
    })
  })

  describe('compareMatchesForScheduling', () => {
    it('sorts by status priority: completed > live > scheduled > cancelled', () => {
      const base: SchedulableMatch = {
        id: '1',
        home_team_id: 'h',
        away_team_id: 'a',
        matchday: 1,
        scheduled_at: '2026-09-01T10:00:00Z',
        played_at: null,
        status: 'scheduled',
        created_at: '2026-09-01T00:00:00Z',
      }

      const matchCompleted: SchedulableMatch = { ...base, id: 'comp', status: 'completed' }
      const matchLive: SchedulableMatch = { ...base, id: 'live', status: 'live' }
      const matchScheduled: SchedulableMatch = { ...base, id: 'sched', status: 'scheduled' }
      const matchCancelled: SchedulableMatch = { ...base, id: 'canc', status: 'cancelled' }

      const list = [matchCancelled, matchScheduled, matchCompleted, matchLive]
      list.sort(compareMatchesForScheduling)

      expect(list.map(m => m.id)).toEqual(['comp', 'live', 'sched', 'canc'])
    })

    it('sorts scheduled matches by scheduled_at date', () => {
      const m1: SchedulableMatch = {
        id: 'early',
        home_team_id: 'h',
        away_team_id: 'a',
        matchday: 1,
        scheduled_at: '2026-09-01T10:00:00Z',
        played_at: null,
        status: 'scheduled',
        created_at: '2026-09-01T00:00:00Z',
      }

      const m2: SchedulableMatch = {
        id: 'late',
        home_team_id: 'h',
        away_team_id: 'a',
        matchday: 1,
        scheduled_at: '2026-09-02T10:00:00Z',
        played_at: null,
        status: 'scheduled',
        created_at: '2026-09-01T00:00:00Z',
      }

      expect(compareMatchesForScheduling(m1, m2)).toBeLessThan(0)
      expect(compareMatchesForScheduling(m2, m1)).toBeGreaterThan(0)
    })
  })
})
