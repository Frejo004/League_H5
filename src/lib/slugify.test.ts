import { describe, it, expect } from 'vitest'
import {
  slugify,
  generateTeamSlug,
  generatePlayerSlug,
  generateMatchSlug,
  isValidSlug,
} from './slugify'

describe('slugify utils', () => {
  describe('slugify', () => {
    it('normalizes accents, spaces, and punctuation to lower-case dashed strings', () => {
      expect(slugify('Paris Saint-Germain')).toBe('paris-saint-germain')
      expect(slugify('Équipe A')).toBe('equipe-a')
      expect(slugify('  FC Porto & Benfica ! ')).toBe('fc-porto-benfica')
      expect(slugify('---test---')).toBe('test')
    })
  })

  describe('generateTeamSlug', () => {
    it('generates base slug if not existing', () => {
      expect(generateTeamSlug('Les Faucons', [])).toBe('les-faucons')
    })

    it('appends incrementing counter on collisions', () => {
      const existing = ['les-faucons', 'les-faucons-2']
      expect(generateTeamSlug('Les Faucons', existing)).toBe('les-faucons-3')
    })
  })

  describe('generatePlayerSlug', () => {
    it('generates first-last slug', () => {
      expect(generatePlayerSlug('Kylian', 'Mbappé', [])).toBe('kylian-mbappe')
    })

    it('handles collision for players with identical names', () => {
      const existing = ['john-doe']
      expect(generatePlayerSlug('John', 'Doe', existing)).toBe('john-doe-2')
    })
  })

  describe('generateMatchSlug', () => {
    it('generates home-vs-away-j{day} format', () => {
      expect(generateMatchSlug('Team A', 'Team B', 3, [])).toBe('team-a-vs-team-b-j3')
    })

    it('handles collision for replayed matches', () => {
      const existing = ['team-a-vs-team-b-j3']
      expect(generateMatchSlug('Team A', 'Team B', 3, existing)).toBe('team-a-vs-team-b-j3-2')
    })
  })

  describe('isValidSlug', () => {
    it('validates proper slug formats', () => {
      expect(isValidSlug('mon-equipe-1')).toBe(true)
      expect(isValidSlug('equipe')).toBe(true)
      expect(isValidSlug('Mon-Equipe')).toBe(false)
      expect(isValidSlug('-equipe-')).toBe(false)
      expect(isValidSlug('equipe with space')).toBe(false)
    })
  })
})
