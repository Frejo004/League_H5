import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatTime,
  formatDateTime,
  startOfDayInAppTZ,
  APP_TIMEZONE,
} from './dateUtils'

describe('dateUtils', () => {
  it('has APP_TIMEZONE set to Africa/Porto-Novo', () => {
    expect(APP_TIMEZONE).toBe('Africa/Porto-Novo')
  })

  describe('formatDate', () => {
    it('formats a date string correctly in French locale', () => {
      // 2026-09-15T14:30:00Z -> 15/09/2026
      const formatted = formatDate('2026-09-15T14:30:00Z')
      expect(formatted).toBe('15/09/2026')
    })
  })

  describe('formatTime', () => {
    it('formats time taking UTC+1 into account', () => {
      // 2026-09-15T14:30:00Z in Africa/Porto-Novo (UTC+1) is 15:30
      const formatted = formatTime('2026-09-15T14:30:00Z')
      expect(formatted).toContain('15:30')
    })
  })

  describe('formatDateTime', () => {
    it('formats both date and time', () => {
      const formatted = formatDateTime('2026-09-15T14:30:00Z')
      expect(formatted).toContain('15/09/2026')
      expect(formatted).toContain('15:30')
    })
  })

  describe('startOfDayInAppTZ', () => {
    it('returns a Date object at midnight', () => {
      const d = startOfDayInAppTZ('2026-09-15T18:45:00Z')
      expect(d.getHours()).toBe(0)
      expect(d.getMinutes()).toBe(0)
      expect(d.getSeconds()).toBe(0)
    })
  })
})
