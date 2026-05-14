-- Migration: Ajouter halftime_at à la table matches
-- Permet de calculer le décompte de mi-temps côté client (5 min de pause)

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS halftime_at timestamptz DEFAULT NULL;

-- Commentaire
COMMENT ON COLUMN matches.halftime_at IS 
  'Timestamp du moment où l''admin a signalé la mi-temps. Utilisé pour calculer le décompte de 5 min côté client avant le coup d''envoi de la 2ème mi-temps.';
