-- Migration: Corriger la fonction de génération de slugs pour gérer correctement les majuscules
-- Date: 2026-05-17
-- Description: Corrige la fonction slugify SQL pour éviter que les lettres majuscules soient supprimées

-- 1. Corriger la fonction slugify pour mettre en minuscule AVANT de filtrer les caractères
CREATE OR REPLACE FUNCTION slugify(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        -- Normaliser et mettre en minuscules d'abord !
        lower(unaccent(trim(input_text))),
        -- Remplacer espaces et underscores par des tirets
        '[\s_]+', '-', 'g'
      ),
      -- Supprimer les caractères non alphanumériques (sauf tirets)
      '[^a-z0-9-]+', '', 'g'
    ),
    -- Remplacer les tirets multiples par un seul
    '-+', '-', 'g'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Recalculer proprement les slugs de TOUTES les équipes
WITH team_slugs AS (
  SELECT 
    id,
    slugify(name) as base_slug,
    ROW_NUMBER() OVER (PARTITION BY slugify(name) ORDER BY created_at) as rn
  FROM teams
)
UPDATE teams t
SET slug = CASE 
  WHEN ts.rn = 1 THEN ts.base_slug
  ELSE ts.base_slug || '-' || ts.rn
END
FROM team_slugs ts
WHERE t.id = ts.id;

-- 3. Recalculer proprement les slugs de TOUS les joueurs
WITH player_slugs AS (
  SELECT 
    id,
    slugify(first_name || '-' || last_name) as base_slug,
    ROW_NUMBER() OVER (PARTITION BY slugify(first_name || '-' || last_name) ORDER BY created_at) as rn
  FROM players
)
UPDATE players p
SET slug = CASE 
  WHEN ps.rn = 1 THEN ps.base_slug
  ELSE ps.base_slug || '-' || ps.rn
END
FROM player_slugs ps
WHERE p.id = ps.id;

-- 4. Recalculer proprement les slugs de TOUS les matchs
WITH match_slugs AS (
  SELECT 
    m.id,
    slugify(ht.name || '-vs-' || at.name || '-j' || m.matchday) as base_slug,
    ROW_NUMBER() OVER (
      PARTITION BY slugify(ht.name || '-vs-' || at.name || '-j' || m.matchday) 
      ORDER BY m.created_at
    ) as rn
  FROM matches m
  JOIN teams ht ON m.home_team_id = ht.id
  JOIN teams at ON m.away_team_id = at.id
)
UPDATE matches m
SET slug = CASE 
  WHEN ms.rn = 1 THEN ms.base_slug
  ELSE ms.base_slug || '-' || ms.rn
END
FROM match_slugs ms
WHERE m.id = ms.id;
