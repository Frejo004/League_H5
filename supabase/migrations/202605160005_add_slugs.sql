-- Migration: Ajouter des slugs URL-friendly pour teams, players et matches
-- Date: 2026-05-16
-- Description: Remplace les IDs dans les URLs par des slugs lisibles et SEO-friendly

-- ============================================================================
-- 1. AJOUTER LES COLONNES SLUG
-- ============================================================================

-- Ajouter slug à la table teams
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Ajouter slug à la table players
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Ajouter slug à la table matches
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- ============================================================================
-- 2. FONCTION UTILITAIRE POUR GÉNÉRER DES SLUGS
-- ============================================================================

CREATE OR REPLACE FUNCTION slugify(text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          -- Normaliser les caractères accentués
          unaccent(trim(text)),
          -- Remplacer espaces et underscores par des tirets
          '[\s_]+', '-', 'g'
        ),
        -- Supprimer les caractères non alphanumériques (sauf tirets)
        '[^a-z0-9-]+', '', 'g'
      ),
      -- Remplacer les tirets multiples par un seul
      '-+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- 3. GÉNÉRER LES SLUGS POUR LES DONNÉES EXISTANTES
-- ============================================================================

-- Générer les slugs pour les équipes existantes
WITH team_slugs AS (
  SELECT 
    id,
    slugify(name) as base_slug,
    ROW_NUMBER() OVER (PARTITION BY slugify(name) ORDER BY created_at) as rn
  FROM teams
  WHERE slug IS NULL
)
UPDATE teams t
SET slug = CASE 
  WHEN ts.rn = 1 THEN ts.base_slug
  ELSE ts.base_slug || '-' || ts.rn
END
FROM team_slugs ts
WHERE t.id = ts.id;

-- Générer les slugs pour les joueurs existants
WITH player_slugs AS (
  SELECT 
    id,
    slugify(first_name || '-' || last_name) as base_slug,
    ROW_NUMBER() OVER (PARTITION BY slugify(first_name || '-' || last_name) ORDER BY created_at) as rn
  FROM players
  WHERE slug IS NULL
)
UPDATE players p
SET slug = CASE 
  WHEN ps.rn = 1 THEN ps.base_slug
  ELSE ps.base_slug || '-' || ps.rn
END
FROM player_slugs ps
WHERE p.id = ps.id;

-- Générer les slugs pour les matchs existants
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
  WHERE m.slug IS NULL
)
UPDATE matches m
SET slug = CASE 
  WHEN ms.rn = 1 THEN ms.base_slug
  ELSE ms.base_slug || '-' || ms.rn
END
FROM match_slugs ms
WHERE m.id = ms.id;

-- ============================================================================
-- 4. AJOUTER LES CONTRAINTES
-- ============================================================================

-- Rendre les slugs obligatoires (NOT NULL)
ALTER TABLE teams 
ALTER COLUMN slug SET NOT NULL;

ALTER TABLE players 
ALTER COLUMN slug SET NOT NULL;

ALTER TABLE matches 
ALTER COLUMN slug SET NOT NULL;

-- Ajouter des contraintes d'unicité
-- Pour les équipes : slug unique par saison
CREATE UNIQUE INDEX IF NOT EXISTS teams_slug_season_idx 
ON teams(slug, season_id);

-- Pour les joueurs : slug unique par saison
CREATE UNIQUE INDEX IF NOT EXISTS players_slug_season_idx 
ON players(slug, season_id);

-- Pour les matchs : slug unique par saison
CREATE UNIQUE INDEX IF NOT EXISTS matches_slug_season_idx 
ON matches(slug, season_id);

-- Ajouter des index pour améliorer les performances de recherche par slug
CREATE INDEX IF NOT EXISTS teams_slug_idx ON teams(slug);
CREATE INDEX IF NOT EXISTS players_slug_idx ON players(slug);
CREATE INDEX IF NOT EXISTS matches_slug_idx ON matches(slug);

-- ============================================================================
-- 5. FONCTION POUR AUTO-GÉNÉRER LES SLUGS À L'INSERTION
-- ============================================================================

-- Fonction pour générer automatiquement le slug d'une équipe
CREATE OR REPLACE FUNCTION generate_team_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 1;
BEGIN
  -- Si un slug est déjà fourni, le valider et le garder
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    NEW.slug := slugify(NEW.slug);
    RETURN NEW;
  END IF;
  
  -- Générer le slug de base à partir du nom
  base_slug := slugify(NEW.name);
  final_slug := base_slug;
  
  -- Vérifier l'unicité et ajouter un suffixe si nécessaire
  WHILE EXISTS (
    SELECT 1 FROM teams 
    WHERE slug = final_slug 
    AND season_id = NEW.season_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer automatiquement le slug d'un joueur
CREATE OR REPLACE FUNCTION generate_player_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 1;
BEGIN
  -- Si un slug est déjà fourni, le valider et le garder
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    NEW.slug := slugify(NEW.slug);
    RETURN NEW;
  END IF;
  
  -- Générer le slug de base à partir du prénom et nom
  base_slug := slugify(NEW.first_name || '-' || NEW.last_name);
  final_slug := base_slug;
  
  -- Vérifier l'unicité et ajouter un suffixe si nécessaire
  WHILE EXISTS (
    SELECT 1 FROM players 
    WHERE slug = final_slug 
    AND season_id = NEW.season_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer automatiquement le slug d'un match
CREATE OR REPLACE FUNCTION generate_match_slug()
RETURNS TRIGGER AS $$
DECLARE
  home_team_name TEXT;
  away_team_name TEXT;
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 1;
BEGIN
  -- Si un slug est déjà fourni, le valider et le garder
  IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
    NEW.slug := slugify(NEW.slug);
    RETURN NEW;
  END IF;
  
  -- Récupérer les noms des équipes
  SELECT name INTO home_team_name FROM teams WHERE id = NEW.home_team_id;
  SELECT name INTO away_team_name FROM teams WHERE id = NEW.away_team_id;
  
  -- Générer le slug de base
  base_slug := slugify(home_team_name || '-vs-' || away_team_name || '-j' || NEW.matchday);
  final_slug := base_slug;
  
  -- Vérifier l'unicité et ajouter un suffixe si nécessaire
  WHILE EXISTS (
    SELECT 1 FROM matches 
    WHERE slug = final_slug 
    AND season_id = NEW.season_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. CRÉER LES TRIGGERS
-- ============================================================================

-- Trigger pour les équipes
DROP TRIGGER IF EXISTS teams_slug_trigger ON teams;
CREATE TRIGGER teams_slug_trigger
  BEFORE INSERT OR UPDATE OF name ON teams
  FOR EACH ROW
  EXECUTE FUNCTION generate_team_slug();

-- Trigger pour les joueurs
DROP TRIGGER IF EXISTS players_slug_trigger ON players;
CREATE TRIGGER players_slug_trigger
  BEFORE INSERT OR UPDATE OF first_name, last_name ON players
  FOR EACH ROW
  EXECUTE FUNCTION generate_player_slug();

-- Trigger pour les matchs
DROP TRIGGER IF EXISTS matches_slug_trigger ON matches;
CREATE TRIGGER matches_slug_trigger
  BEFORE INSERT OR UPDATE OF home_team_id, away_team_id, matchday ON matches
  FOR EACH ROW
  EXECUTE FUNCTION generate_match_slug();

-- ============================================================================
-- 7. ACTIVER L'EXTENSION UNACCENT SI NÉCESSAIRE
-- ============================================================================

-- L'extension unaccent est nécessaire pour la fonction slugify
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================================
-- COMMENTAIRES
-- ============================================================================

COMMENT ON COLUMN teams.slug IS 'Slug URL-friendly pour les équipes (ex: paris-saint-germain)';
COMMENT ON COLUMN players.slug IS 'Slug URL-friendly pour les joueurs (ex: kylian-mbappe)';
COMMENT ON COLUMN matches.slug IS 'Slug URL-friendly pour les matchs (ex: psg-vs-om-j10)';

COMMENT ON FUNCTION slugify(TEXT) IS 'Convertit un texte en slug URL-friendly';
COMMENT ON FUNCTION generate_team_slug() IS 'Génère automatiquement un slug unique pour une équipe';
COMMENT ON FUNCTION generate_player_slug() IS 'Génère automatiquement un slug unique pour un joueur';
COMMENT ON FUNCTION generate_match_slug() IS 'Génère automatiquement un slug unique pour un match';
