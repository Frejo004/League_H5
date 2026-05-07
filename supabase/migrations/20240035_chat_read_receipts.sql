-- ============================================================
-- Migration 035 — chat_read_receipts
-- Stocke le dernier message lu par chaque membre d'une équipe
-- ============================================================

create table public.chat_read_receipts (
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  team_id        uuid        not null references public.teams(id) on delete cascade,
  last_read_at   timestamptz not null default now(),
  last_read_msg  uuid        references public.team_messages(id) on delete set null,
  updated_at     timestamptz not null default now(),
  primary key (user_id, team_id)
);

create index chat_read_receipts_team_idx on public.chat_read_receipts(team_id);

create trigger chat_read_receipts_updated_at
  before update on public.chat_read_receipts
  for each row execute function public.set_updated_at();

-- Activer Realtime
alter publication supabase_realtime add table public.chat_read_receipts;

-- ============================================================
-- RLS
-- ============================================================
alter table public.chat_read_receipts enable row level security;

-- Lecture : membres de l'équipe
create policy "read_receipts: team members read"
  on public.chat_read_receipts for select
  to authenticated
  using (
    exists (
      select 1 from public.players
      where team_id = chat_read_receipts.team_id
        and user_id = auth.uid()
        and is_active = true
    )
    or exists (
      select 1 from public.teams
      where id = chat_read_receipts.team_id
        and captain_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Upsert : chacun gère son propre receipt
create policy "read_receipts: own upsert"
  on public.chat_read_receipts for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "read_receipts: own update"
  on public.chat_read_receipts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
