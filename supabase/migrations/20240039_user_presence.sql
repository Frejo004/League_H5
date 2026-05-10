-- ============================================================
-- Migration 039 — Présence utilisateur (statut en ligne)
-- ============================================================

-- Table de présence : un enregistrement par utilisateur connecté
create table public.user_presence (
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  online_at   timestamptz not null default now(),
  -- Heartbeat : mis à jour toutes les 30s par le client
  last_seen   timestamptz not null default now(),
  primary key (user_id)
);

-- Index pour les requêtes "qui est en ligne dans les X dernières secondes"
create index user_presence_last_seen_idx on public.user_presence(last_seen desc);

-- Trigger pour mettre à jour last_seen automatiquement
create or replace function public.set_presence_last_seen()
returns trigger language plpgsql as $$
begin
  new.last_seen := now();
  return new;
end;
$$;

create trigger user_presence_last_seen
  before update on public.user_presence
  for each row execute function public.set_presence_last_seen();

-- RLS
alter table public.user_presence enable row level security;

-- Tout le monde peut lire la présence
create policy "presence: read all"
  on public.user_presence for select
  to authenticated using (true);

-- Chacun ne peut écrire que sa propre présence
create policy "presence: upsert own"
  on public.user_presence for insert
  to authenticated with check (user_id = auth.uid());

create policy "presence: update own"
  on public.user_presence for update
  to authenticated using (user_id = auth.uid());

create policy "presence: delete own"
  on public.user_presence for delete
  to authenticated using (user_id = auth.uid());

-- Realtime
alter publication supabase_realtime add table public.user_presence;

-- Fonction helper : est-ce qu'un utilisateur est en ligne ?
-- "En ligne" = last_seen dans les 45 dernières secondes
create or replace function public.is_user_online(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from user_presence
    where user_id = p_user_id
      and last_seen > now() - interval '45 seconds'
  );
$$;

-- Fonction : liste des utilisateurs en ligne parmi une liste d'IDs
create or replace function public.get_online_users(p_user_ids uuid[])
returns uuid[]
language sql
security definer
stable
set search_path = public
as $$
  select array_agg(user_id)
  from user_presence
  where user_id = any(p_user_ids)
    and last_seen > now() - interval '45 seconds';
$$;
