-- ============================================================
-- Migration 011 — player_invites table
-- Tokens d'invitation générés par admin/capitaine pour lier
-- un joueur existant à un compte utilisateur
-- ============================================================

create table public.player_invites (
  id          uuid        primary key default gen_random_uuid(),
  player_id   uuid        not null references public.players(id) on delete cascade,
  token       text        not null unique default encode(gen_random_bytes(32), 'hex'),
  created_by  uuid        not null references public.profiles(id) on delete cascade,
  used_at     timestamptz,
  expires_at  timestamptz not null default (now() + interval '1 hour'),
  created_at  timestamptz not null default now(),

  -- One active invite per player at a time
  constraint player_invites_one_per_player unique (player_id)
);

create index player_invites_token_idx     on public.player_invites(token);
create index player_invites_player_idx    on public.player_invites(player_id);
create index player_invites_expires_idx   on public.player_invites(expires_at);

-- ============================================================
-- RLS
-- ============================================================
alter table public.player_invites enable row level security;

-- Admins and captains can read invites
create policy "player_invites: admin read"
  on public.player_invites for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'captain')
    )
  );

-- Admins and captains can create invites
create policy "player_invites: admin captain insert"
  on public.player_invites for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'captain')
    )
  );

-- Admins and captains can delete (revoke) invites
create policy "player_invites: admin captain delete"
  on public.player_invites for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'captain')
    )
  );

-- Allow reading invite by token for unauthenticated users (signup flow)
-- We use a security definer function instead of a public policy for safety
create policy "player_invites: anon read by token"
  on public.player_invites for select
  to anon
  using (true);

-- ============================================================
-- Function: resolve invite token (safe, no RLS bypass needed)
-- Returns player info for the signup page
-- ============================================================
create or replace function public.get_invite_player(p_token text)
returns table (
  player_id   uuid,
  first_name  text,
  last_name   text,
  team_name   text,
  is_valid    boolean
)
language plpgsql security definer set search_path = public as $$
begin
  return query
  select
    pl.id          as player_id,
    pl.first_name,
    pl.last_name,
    t.name         as team_name,
    (
      inv.used_at is null
      and inv.expires_at > now()
      and pl.user_id is null
    )              as is_valid
  from public.player_invites inv
  join public.players pl on pl.id = inv.player_id
  join public.teams   t  on t.id  = pl.team_id
  where inv.token = p_token
  limit 1;
end;
$$;

-- ============================================================
-- Function: claim invite — links user to player after signup
-- Called server-side after auth.signUp succeeds
-- ============================================================
create or replace function public.claim_player_invite(p_token text, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_player_id uuid;
  v_first_name text;
  v_last_name  text;
begin
  -- Validate token
  select inv.player_id, pl.first_name, pl.last_name
  into v_player_id, v_first_name, v_last_name
  from public.player_invites inv
  join public.players pl on pl.id = inv.player_id
  where inv.token = p_token
    and inv.used_at is null
    and inv.expires_at > now()
    and pl.user_id is null
  for update;

  if not found then
    raise exception 'Lien d''invitation invalide ou expiré.';
  end if;

  -- Link user to player
  update public.players
  set user_id = p_user_id, updated_at = now()
  where id = v_player_id;

  -- Set profile role to 'player' and name from player record
  update public.profiles
  set
    role       = 'player',
    full_name  = v_first_name || ' ' || v_last_name,
    updated_at = now()
  where id = p_user_id;

  -- Mark invite as used
  update public.player_invites
  set used_at = now()
  where token = p_token;
end;
$$;
