-- Migration: Ajout de la table pour les commentaires/retours des joueurs sur les matchs

-- 1. Créer la table match_feedback
CREATE TABLE IF NOT EXISTS public.match_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  overall_experience TEXT,
  referee_performance TEXT,
  player_behavior TEXT,
  other_comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Créer les indexes
CREATE INDEX IF NOT EXISTS idx_match_feedback_match_id ON public.match_feedback(match_id);
CREATE INDEX IF NOT EXISTS idx_match_feedback_player_id ON public.match_feedback(player_id);
CREATE INDEX IF NOT EXISTS idx_match_feedback_team_id ON public.match_feedback(team_id);

-- 3. Ajouter la politique RLS (seulement les joueurs du match et les admins peuvent accéder)
ALTER TABLE public.match_feedback ENABLE ROW LEVEL SECURITY;

-- Politique: les joueurs peuvent voir tout le feedback des matchs dans lesquels ils ont participé + les admins voient tout
DROP POLICY IF EXISTS "match_feedback_select" ON public.match_feedback;
CREATE POLICY "match_feedback_select"
  ON public.match_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 
      FROM public.players p
      INNER JOIN public.matches m ON (p.team_id = m.home_team_id OR p.team_id = m.away_team_id)
      WHERE p.user_id = auth.uid() AND m.id = match_feedback.match_id
    )
  );

-- Politique: les joueurs du match peuvent ajouter un feedback
DROP POLICY IF EXISTS "match_feedback_insert" ON public.match_feedback;
CREATE POLICY "match_feedback_insert"
  ON public.match_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.players p
      INNER JOIN public.matches m ON (p.team_id = m.home_team_id OR p.team_id = m.away_team_id)
      WHERE p.id = player_id AND p.user_id = auth.uid() AND m.id = match_id
    )
  );

-- Politique: les joueurs peuvent mettre à jour leur feedback pendant 24 heures
DROP POLICY IF EXISTS "match_feedback_update" ON public.match_feedback;
CREATE POLICY "match_feedback_update"
  ON public.match_feedback
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.players
      WHERE id = match_feedback.player_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) OR
    (
      EXISTS (
        SELECT 1 FROM public.players
        WHERE id = match_feedback.player_id AND user_id = auth.uid()
      ) AND
      (NOW() - match_feedback.created_at) <= INTERVAL '24 hours'
    )
  );

-- Politique: les joueurs peuvent supprimer leur feedback pendant 24 heures
DROP POLICY IF EXISTS "match_feedback_delete" ON public.match_feedback;
CREATE POLICY "match_feedback_delete"
  ON public.match_feedback
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) OR
    (
      EXISTS (
        SELECT 1 FROM public.players
        WHERE id = match_feedback.player_id AND user_id = auth.uid()
      ) AND
      (NOW() - match_feedback.created_at) <= INTERVAL '24 hours'
    )
  );

-- 4. Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.set_match_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS match_feedback_updated_at ON public.match_feedback;
CREATE TRIGGER match_feedback_updated_at
BEFORE UPDATE ON public.match_feedback
FOR EACH ROW EXECUTE FUNCTION public.set_match_feedback_updated_at();