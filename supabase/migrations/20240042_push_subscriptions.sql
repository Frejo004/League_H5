-- ============================================================
-- Migration 042 — Abonnements aux notifications push natives
-- ============================================================

create table public.push_subscriptions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  endpoint     text        not null,
  p256dh       text        not null,
  auth         text        not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Un endpoint unique par utilisateur
  unique (user_id, endpoint)
);

create index push_subscriptions_user_idx on public.push_subscriptions(user_id);

create trigger push_subscriptions_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: read own"
  on public.push_subscriptions for select
  to authenticated using (user_id = auth.uid());

create policy "push_subscriptions: insert own"
  on public.push_subscriptions for insert
  to authenticated with check (user_id = auth.uid());

create policy "push_subscriptions: update own"
  on public.push_subscriptions for update
  to authenticated using (user_id = auth.uid());

create policy "push_subscriptions: delete own"
  on public.push_subscriptions for delete
  to authenticated using (user_id = auth.uid());
