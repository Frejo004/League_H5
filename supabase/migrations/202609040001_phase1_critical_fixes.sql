-- ============================================================
-- Migration 202609040001 — Phase 1 Critical Fixes
-- 1. Restore EXECUTE permissions for player invite RPCs (SEC-01)
-- 2. Allow nullable home_team_id & away_team_id for playoff bracket matches (BUG-01)
-- ============================================================

-- ── 1. Rétablissement des droits RPC d'invitation ───────────
-- get_invite_player et claim_player_invite sont des fonctions SECURITY DEFINER
-- utilisées par l'onboarding pour résoudre le token et associer l'utilisateur à son joueur.
GRANT EXECUTE ON FUNCTION public.get_invite_player(p_token text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_player_invite(p_token text, p_user_id uuid) TO anon, authenticated;

-- ── 2. Assouplissement des équipes pour les phases finales (Playoffs) ──
-- Les matchs des rounds ultérieurs (ex: demi-finales, finale) sont générés
-- avant que les équipes ne soient qualifiées (équipes "À déterminer").
-- home_team_id et away_team_id doivent donc être nullables.
ALTER TABLE public.matches ALTER COLUMN home_team_id DROP NOT NULL;
ALTER TABLE public.matches ALTER COLUMN away_team_id DROP NOT NULL;

-- Mise à jour de la contrainte pour autoriser les cas où les équipes ne sont pas encore définies
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_different_teams;
ALTER TABLE public.matches ADD CONSTRAINT matches_different_teams CHECK (
  home_team_id IS NULL OR away_team_id IS NULL OR home_team_id <> away_team_id
);
