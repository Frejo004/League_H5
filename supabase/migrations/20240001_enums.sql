-- ============================================================
-- Migration 001 — Custom ENUM types
-- ============================================================

create type public.user_role as enum (
  'admin',
  'captain',
  'player',
  'spectator'
);

create type public.match_status as enum (
  'scheduled',
  'completed',
  'cancelled'
);

create type public.spectator_status as enum (
  'pending',
  'approved',
  'rejected'
);

create type public.player_position as enum (
  'goalkeeper',
  'defender',
  'midfielder',
  'forward'
);
