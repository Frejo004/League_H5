-- Élargit la contrainte CHECK sur match_events.type
-- pour inclure les types stats (shot, shot_on_target, foul, corner)
-- et les types système (pause, resume)

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE public.match_events
DROP CONSTRAINT IF EXISTS match_events_type_check;

-- 2. Recréer avec tous les types utilisés
ALTER TABLE public.match_events
ADD CONSTRAINT match_events_type_check CHECK (type IN (
  'goal',           -- but
  'own_goal',       -- but contre son camp
  'yellow_card',    -- carton jaune
  'red_card',       -- carton rouge
  'substitution',   -- remplacement
  'kickoff',        -- coup d'envoi
  'halftime',       -- mi-temps
  'fulltime',       -- fin du match
  'comment',        -- commentaire libre
  'shot',           -- tir (stat)
  'shot_on_target', -- tir cadré (stat)
  'foul',           -- faute (stat)
  'corner',         -- corner (stat)
  'pause',          -- match suspendu
  'resume'          -- reprise du jeu
));

-- 3. Élargir aussi la contrainte sur minute (peut dépasser 45 en 2ème MT)
ALTER TABLE public.match_events
DROP CONSTRAINT IF EXISTS match_events_minute_check;

ALTER TABLE public.match_events
ADD CONSTRAINT match_events_minute_check CHECK (minute >= 0 AND minute <= 120);
