-- ============================================================
-- Migration 0003 — Sondages et Pronostics
-- ============================================================

CREATE TYPE poll_status AS ENUM ('draft', 'active', 'closed', 'completed');

-- Table des sondages
CREATE TABLE public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  status poll_status NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX polls_season_idx ON public.polls(season_id);
CREATE INDEX polls_match_idx ON public.polls(match_id);
CREATE INDEX polls_status_idx ON public.polls(status);

CREATE TRIGGER polls_updated_at
  BEFORE UPDATE ON public.polls
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Table des votes/pronostics
CREATE TABLE public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  option_index INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Un utilisateur ne peut voter qu'une fois par sondage
  UNIQUE(poll_id, user_id)
);

CREATE INDEX predictions_poll_idx ON public.predictions(poll_id);
CREATE INDEX predictions_user_idx ON public.predictions(user_id);

-- RLS policies
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Politiques pour les sondages
CREATE POLICY "polls: authenticated read"
  ON public.polls FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "polls: admin create/update/delete"
  ON public.polls FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Politiques pour les pronostics
CREATE POLICY "predictions: authenticated read"
  ON public.predictions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "predictions: authenticated create own"
  ON public.predictions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "predictions: authenticated update/delete own"
  ON public.predictions FOR ALL
  TO authenticated USING (user_id = auth.uid());
