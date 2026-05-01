-- ============================================================
-- Migration 004 — teams table
-- ============================================================

create table public.teams (
  id          uuid        primary key default gen_random_uuid(),
  season_id   uuid        not null references public.seasons(id) on delete cascade,
  name        text        not null,
  color       text        not null default '#16a34a',
  logo_url    text,
  captain_id  uuid        references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index teams_season_idx on public.teams(season_id);
create index teams_captain_idx on public.teams(captain_id);

-- Team names must be unique within a season
create unique index teams_name_season_idx on public.teams(season_id, name);

create trigger teams_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.teams enable row level security;

create policy "teams: authenticated read"
  on public.teams for select
  to authenticated
  using (true);

create policy "teams: admin insert"
  on public.teams for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "teams: admin update"
  on public.teams for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Captains can update their own team
create policy "teams: captain update own"
  on public.teams for update
  to authenticated
  using (captain_id = auth.uid())
  with check (captain_id = auth.uid());

create policy "teams: admin delete"
  on public.teams for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
