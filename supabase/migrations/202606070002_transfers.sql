-- ============================================================
-- Migration 0002 — Système de transferts
-- ============================================================

CREATE TYPE transfer_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'completed'
);

CREATE TABLE public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  from_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  to_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status transfer_status NOT NULL DEFAULT 'pending',
  reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX transfers_player_idx ON public.transfers(player_id);
CREATE INDEX transfers_from_team_idx ON public.transfers(from_team_id);
CREATE INDEX transfers_to_team_idx ON public.transfers(to_team_id);
CREATE INDEX transfers_season_idx ON public.transfers(season_id);
CREATE INDEX transfers_status_idx ON public.transfers(status);

CREATE TRIGGER transfers_updated_at
  BEFORE UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS policies
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- Tout le monde authentifié peut voir les transferts de la saison active
CREATE POLICY "transfers: authenticated read"
  ON public.transfers FOR SELECT
  TO authenticated USING (true);

-- Admin, capitaines et le joueur concerné peuvent créer des transferts
CREATE POLICY "transfers: create"
  ON public.transfers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid()
        AND (
          role = 'admin'
          OR role = 'captain'
          OR id = (
            SELECT user_id FROM public.players WHERE id = player_id
          )
        )
    )
  );

-- Admin et capitaines peuvent mettre à jour les transferts
CREATE POLICY "transfers: update"
  ON public.transfers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid()
        AND (role = 'admin' OR role = 'captain')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid()
        AND (role = 'admin' OR role = 'captain')
    )
  );

-- Seulement les admins peuvent supprimer des transferts
CREATE POLICY "transfers: delete"
  ON public.transfers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
