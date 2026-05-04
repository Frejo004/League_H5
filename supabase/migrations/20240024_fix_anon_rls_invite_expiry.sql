-- ============================================================
-- Migration 024 — Corrections sécurité & cohérence invitations
--
-- Fix 1 : Supprimer la policy RLS anon "using (true)" qui expose
--         toute la table player_invites sans authentification.
--         La fonction get_invite_player (security definer) suffit.
--
-- Fix 2 : Corriger l'expiration des invitations de 1h → 7 jours
--         pour correspondre à ce qu'affiche l'UI.
-- ============================================================

-- ── Fix 1 : Supprimer la policy anon trop permissive ─────────────────────────
drop policy if exists "player_invites: anon read by token" on public.player_invites;

-- La fonction get_invite_player est security definer et ne retourne
-- que les champs nécessaires (prénom, nom, équipe, is_valid) pour
-- un token donné. Aucune policy anon n'est nécessaire.

-- ── Fix 2 : Expiration 7 jours (cohérence avec l'UI) ─────────────────────────
alter table public.player_invites
  alter column expires_at set default (now() + interval '7 days');

-- Note : les invitations existantes conservent leur expiration d'origine.
-- Seules les nouvelles invitations créées après cette migration expirent à 7 jours.
