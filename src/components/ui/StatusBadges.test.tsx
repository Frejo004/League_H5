import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoleBadge, TransferStatusBadge, MatchStatusBadge } from './StatusBadges'

describe('StatusBadges Components', () => {
  describe('RoleBadge', () => {
    it('renders admin badge correctly', () => {
      render(<RoleBadge role="admin" />)
      const badge = screen.getByText('Admin')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-amber-500/15')
    })

    it('renders fallback badge for unknown role', () => {
      render(<RoleBadge role="unknown_role" />)
      const badge = screen.getByText('unknown_role')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-slate-500/15')
    })
  })

  describe('TransferStatusBadge', () => {
    it('renders pending status correctly', () => {
      render(<TransferStatusBadge status="pending" />)
      const badge = screen.getByText('En attente')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-yellow-500/15')
    })
  })

  describe('MatchStatusBadge', () => {
    it('renders live status correctly', () => {
      render(<MatchStatusBadge status="live" />)
      const badge = screen.getByText('En direct')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('bg-red-500/15')
    })
  })
})
