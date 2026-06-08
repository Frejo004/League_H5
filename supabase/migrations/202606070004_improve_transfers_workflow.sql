-- ============================================================
-- Migration 0004 — Amélioration workflow transferts
-- ============================================================

-- Ajout des nouveaux statuts
ALTER TYPE transfer_status ADD VALUE IF NOT EXISTS 'player_requested';
ALTER TYPE transfer_status ADD VALUE IF NOT EXISTS 'home_captain_approved';
ALTER TYPE transfer_status ADD VALUE IF NOT EXISTS 'admin_approved';

-- Ajout des nouveaux champs
ALTER TABLE public.transfers
  ADD COLUMN home_captain_approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN home_captain_approved_at TIMESTAMPTZ,
  ADD COLUMN admin_approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN admin_approved_at TIMESTAMPTZ,
  ADD COLUMN away_captain_approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN away_captain_approved_at TIMESTAMPTZ;
