-- ============================================================
-- Migration 010 — spectators table
-- ============================================================

create table public.spectators (
  id           uuid                     primary key default gen_random_uuid(),
  user_id      uuid                     not null references public.profiles(id) on delete cascade,
  season_id    uuid                     not null references public.seasons(id) on delete cascade,
  status       public.spectator_status  not null default 'pending',
  requested_at timestamptz              not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid                     references public.profiles(id) on delete set null,

  -- One request per user per season
  constraint spectators_unique_request unique (user_id, season_id)
);

create index spectators_user_idx    on public.spectators(user_id);
create index spectators_season_idx  on public.spectators(season_id);
create index spectators_status_idx  on public.spectators(status);

-- ============================================================
-- RLS
-- ============================================================
alter table public.spectators enable row level security;

-- Admins see all requests
create policy "spectators: admin read"
  on public.spectators for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Users can see their own request
create policy "spectators: own read"
  on public.spectators for select
  to authenticated
  using (user_id = auth.uid());

-- Any authenticated user can submit a request
create policy "spectators: authenticated insert"
  on public.spectators for insert
  to authenticated
  with check (user_id = auth.uid());

-- Only admins can update status
create policy "spectators: admin update"
  on public.spectators for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can delete requests
create policy "spectators: admin delete"
  on public.spectators for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
