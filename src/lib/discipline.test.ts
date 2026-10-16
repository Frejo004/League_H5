import { describe, it, expect } from 'vitest'
import {
  calculateFairplayScore,
  createRedCardSuspensionPayload,
  isPlayerEligible,
  aggregateDisciplinaryEvents,
  type DisciplinaryEvent,
} from './discipline'

describe('Disciplinary Engine', () => {
  describe('calculateFairplayScore', () => {
    it('calculates score based on 1 pt per yellow and 3 pts per red', () => {
      expect(calculateFairplayScore(0, 0)).toBe(0)
      expect(calculateFairplayScore(2, 0)).toBe(2)
      expect(calculateFairplayScore(0, 1)).toBe(3)
      expect(calculateFairplayScore(3, 1)).toBe(6) // 3*1 + 1*3 = 6
    })

    it('handles negative numbers safely', () => {
      expect(calculateFairplayScore(-1, 2)).toBe(6)
    })
  })

  describe('createRedCardSuspensionPayload', () => {
    it('creates automatic 1-match suspension payload', () => {
      const payload = createRedCardSuspensionPayload({
        playerId: 'p-123',
        seasonId: 's-456',
        matchId: 'm-789',
        minute: 42,
      })

      expect(payload).toEqual({
        player_id: 'p-123',
        season_id: 's-456',
        reason: "Carton rouge — J42'",
        match_id_trigger: 'm-789',
        matches_count: 1,
        matches_served: 0,
        is_active: true,
        is_auto_generated: true,
      })
    })
  })

  describe('isPlayerEligible', () => {
    it('returns true when player is not in suspended list (Set)', () => {
      const suspendedSet = new Set(['player-1', 'player-2'])
      expect(isPlayerEligible('player-3', suspendedSet)).toBe(true)
    })

    it('returns false when player is suspended (Set)', () => {
      const suspendedSet = new Set(['player-1', 'player-2'])
      expect(isPlayerEligible('player-1', suspendedSet)).toBe(false)
    })

    it('works with array of suspended IDs', () => {
      expect(isPlayerEligible('player-1', ['player-1'])).toBe(false)
      expect(isPlayerEligible('player-2', ['player-1'])).toBe(true)
    })

    it('returns false if playerId is empty', () => {
      expect(isPlayerEligible('', new Set())).toBe(false)
    })
  })

  describe('aggregateDisciplinaryEvents', () => {
    it('aggregates events correctly for players and teams', () => {
      const events: DisciplinaryEvent[] = [
        { type: 'yellow_card', player_id: 'p1', team_id: 't1' },
        { type: 'yellow_card', player_id: 'p1', team_id: 't1' },
        { type: 'red_card', player_id: 'p2', team_id: 't1' },
        { type: 'yellow_card', player_id: 'p3', team_id: 't2' },
      ]

      const result = aggregateDisciplinaryEvents(events)

      expect(result.totalYellow).toBe(3)
      expect(result.totalRed).toBe(1)

      // Player p1: 2 yellows, 0 red -> score 2
      const p1 = result.players.find(p => p.player_id === 'p1')!
      expect(p1.yellow_cards).toBe(2)
      expect(p1.red_cards).toBe(0)
      expect(p1.fairplay_score).toBe(2)

      // Player p2: 0 yellow, 1 red -> score 3
      const p2 = result.players.find(p => p.player_id === 'p2')!
      expect(p2.yellow_cards).toBe(0)
      expect(p2.red_cards).toBe(1)
      expect(p2.fairplay_score).toBe(3)

      // Team t1: 2 yellows + 1 red -> score 5
      const t1 = result.teams.find(t => t.team_id === 't1')!
      expect(t1.yellow_cards).toBe(2)
      expect(t1.red_cards).toBe(1)
      expect(t1.fairplay_score).toBe(5)

      // Team t2: 1 yellow -> score 1
      const t2 = result.teams.find(t => t.team_id === 't2')!
      expect(t2.yellow_cards).toBe(1)
      expect(t2.fairplay_score).toBe(1)

      // Players sorted by fairplay_score descending
      expect(result.players[0].player_id).toBe('p2') // 3 pts
      expect(result.players[1].player_id).toBe('p1') // 2 pts
    })
  })
})
