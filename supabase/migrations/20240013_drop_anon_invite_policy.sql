-- ============================================================
-- Migration 013 — drop overly permissive anon RLS policy
-- The security definer function get_invite_player() handles
-- unauthenticated token resolution safely.
-- ============================================================

drop policy if exists "player_invites: anon read by token" on public.player_invites;
