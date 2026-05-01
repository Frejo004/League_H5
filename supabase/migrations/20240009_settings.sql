-- ============================================================
-- Migration 009 — settings table (one row per season)
-- ============================================================

create type public.playoff_format as enum ('single', 'two_legs');

create table public.settings (
  id                uuid                    primary key default gen_random_uuid(),
  season_id         uuid                    not null unique references public.seasons(id) on delete cascade,
  league_locked     boolean                 not null default false,
  playoff_enabled   boolean                 not null default false,
  playoff_format    public.playoff_format   not null default 'single',
  teams_in_playoff  smallint                not null default 4 check (teams_in_playoff >= 2 and teams_in_playoff <= 32),
  points_win        smallint                not null default 3 check (points_win >= 0),
  points_draw       smallint                not null default 1 check (points_draw >= 0),
  points_loss       smallint                not null default 0 check (points_loss >= 0),
  created_at        timestamptz             not null default now(),
  updated_at        timestamptz             not null default now()
);

create trigger settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- Auto-create default settings when a season is created
create or replace function public.handle_new_season()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.settings (season_id)
  values (new.id);
  return new;
end;
$$;

create trigger on_season_created
  after insert on public.seasons
  for each row execute function public.handle_new_season();

-- ============================================================
-- RLS
-- ============================================================
alter table public.settings enable row level security;

create policy "settings: authenticated read"
  on public.settings for select
  to authenticated
  using (true);

create policy "settings: admin insert"
  on public.settings for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "settings: admin update"
  on public.settings for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
