-- ============================================================
-- Migration 041 — Système de diffusion live des matchs
-- ============================================================
-- Durée d'un match : 2 × 20 min + 5 min de repos = 45 min total

-- ── 1. Ajouter le statut 'live' ──────────────────────────────────────────────

ALTER TYPE public.match_status ADD VALUE IF NOT EXISTS 'live';

-- ── 2. Colonnes live sur la table matches ────────────────────────────────────

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS live_started_at  timestamptz,
  ADD COLUMN IF NOT EXISTS live_period      smallint DEFAULT 1
    CHECK (live_period IN (1, 2)),           -- 1 = 1ère mi-temps, 2 = 2ème
  ADD COLUMN IF NOT EXISTS live_minute      smallint DEFAULT 0
    CHECK (live_minute >= 0 AND live_minute <= 45);

-- ── 3. Table des événements live ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.match_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id     uuid        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  type         text        NOT NULL CHECK (type IN (
                             'goal',          -- but
                             'own_goal',      -- but contre son camp
                             'yellow_card',   -- carton jaune
                             'red_card',      -- carton rouge
                             'substitution',  -- remplacement
                             'kickoff',       -- coup d'envoi
                             'halftime',      -- mi-temps
                             'fulltime',      -- fin du match
                             'comment'        -- commentaire libre
                           )),
  minute       smallint    CHECK (minute >= 0 AND minute <= 45),
  period       smallint    DEFAULT 1 CHECK (period IN (1, 2)),
  team_id      uuid        REFERENCES public.teams(id) ON DELETE SET NULL,
  player_id    uuid        REFERENCES public.players(id) ON DELETE SET NULL,
  player2_id   uuid        REFERENCES public.players(id) ON DELETE SET NULL, -- remplaçant / passeur
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS match_events_match_idx  ON public.match_events(match_id, created_at DESC);
CREATE INDEX IF NOT EXISTS match_events_type_idx   ON public.match_events(match_id, type);

-- ── 4. Table des réactions live (spectateurs) ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.live_reactions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   uuid        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji      text        NOT NULL CHECK (emoji IN ('⚽','🔥','😱','👏','❤️','😤','🎉')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS live_reactions_match_idx ON public.live_reactions(match_id, created_at DESC);

-- ── 5. Realtime ───────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.match_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_reactions;

-- ── 6. RLS — match_events ────────────────────────────────────────────────────

ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les événements
CREATE POLICY "match_events: authenticated read"
  ON public.match_events FOR SELECT
  TO authenticated USING (true);

-- Seul l'admin peut créer des événements
CREATE POLICY "match_events: admin insert"
  ON public.match_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Seul l'admin peut supprimer
CREATE POLICY "match_events: admin delete"
  ON public.match_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 7. RLS — live_reactions ──────────────────────────────────────────────────

ALTER TABLE public.live_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live_reactions: authenticated read"
  ON public.live_reactions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "live_reactions: insert own"
  ON public.live_reactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ── 8. Fonction : démarrer le live ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.start_match_live(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier que l'appelant est admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  UPDATE matches SET
    status               = 'live',
    live_started_at      = now(),
    live_period          = 1,
    live_minute          = 0,
    played_at            = now(),
    is_paused            = false,
    paused_at            = NULL,
    total_paused_seconds = 0,
    halftime_at          = NULL,
    last_pause_reason    = NULL
  WHERE id = p_match_id AND status = 'scheduled';

  -- Insérer l'événement coup d'envoi
  INSERT INTO match_events (match_id, type, minute, period, created_by)
  VALUES (p_match_id, 'kickoff', 0, 1, auth.uid());
END;
$$;

-- ── 9. Fonction : passer à la 2ème mi-temps ──────────────────────────────────

CREATE OR REPLACE FUNCTION public.match_halftime(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  UPDATE matches SET
    live_period  = 2,
    live_minute  = 0
  WHERE id = p_match_id AND status = 'live';

  INSERT INTO match_events (match_id, type, minute, period, created_by)
  VALUES (p_match_id, 'halftime', 20, 1, auth.uid());
END;
$$;

-- ── 10. Fonction : terminer le match ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.end_match_live(
  p_match_id   uuid,
  p_home_score smallint,
  p_away_score smallint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Permission refusée';
  END IF;

  UPDATE matches SET
    status      = 'completed',
    home_score  = p_home_score,
    away_score  = p_away_score,
    live_minute = 20
  WHERE id = p_match_id AND status = 'live';

  INSERT INTO match_events (match_id, type, minute, period, created_by)
  VALUES (p_match_id, 'fulltime', 20, 2, auth.uid());
END;
$$;
