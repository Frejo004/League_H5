-- ============================================================
-- Migration 001 — Préférences de notifications par utilisateur
-- ============================================================

create table public.user_notification_preferences (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        not null references public.profiles(id) on delete cascade unique,
  match_upcoming          boolean     not null default true,
  match_completed         boolean     not null default true,
  mvp_vote_open           boolean     not null default true,
  invite_pending          boolean     not null default true,
  invite_expiring         boolean     not null default true,
  spectator_request       boolean     not null default true,
  spectator_approved      boolean     not null default true,
  tactique_selected       boolean     not null default true,
  mention                 boolean     not null default true,
  league_news             boolean     not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger user_notification_preferences_updated_at
  before update on public.user_notification_preferences
  for each row execute function public.set_updated_at();

alter table public.user_notification_preferences enable row level security;

create policy "user_notification_preferences: read own"
  on public.user_notification_preferences for select
  to authenticated using (user_id = auth.uid());

create policy "user_notification_preferences: insert own"
  on public.user_notification_preferences for insert
  to authenticated with check (user_id = auth.uid());

create policy "user_notification_preferences: update own"
  on public.user_notification_preferences for update
  to authenticated using (user_id = auth.uid());

-- ============================================================
-- Trigger: auto-create preferences on profile creation
-- ============================================================
create or replace function public.handle_new_user_notification_preferences()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_notification_preferences (user_id)
  values (new.id);
  return new;
end;
$$;

create trigger on_user_created_notification_prefs
  after insert on public.profiles
  for each row execute function public.handle_new_user_notification_preferences();

-- ============================================================
-- Backfill: create preferences for existing users
-- ============================================================
insert into public.user_notification_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
