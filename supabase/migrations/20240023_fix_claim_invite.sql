-- ============================================================
-- Migration 023 — Fix claim_player_invite
-- Le profil peut ne pas encore exister au moment du claim
-- (Supabase crée le profil via trigger AFTER INSERT sur auth.users,
-- mais avec confirmation email activée, le trigger peut être retardé).
-- On utilise INSERT ... ON CONFLICT pour garantir que le profil existe
-- avec le bon rôle avant de faire l'UPDATE.
-- ============================================================

create or replace function public.claim_player_invite(p_token text, p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_player_id  uuid;
  v_first_name text;
  v_last_name  text;
  v_email      text;
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

  -- Récupère l'email depuis auth.users
  select email into v_email
  from auth.users
  where id = p_user_id;

  -- Crée le profil s'il n'existe pas encore (trigger peut être retardé)
  -- ou met à jour le rôle s'il existe déjà
  insert into public.profiles (id, email, full_name, role)
  values (
    p_user_id,
    coalesce(v_email, ''),
    v_first_name || ' ' || v_last_name,
    'player'
  )
  on conflict (id) do update
    set role       = 'player',
        full_name  = v_first_name || ' ' || v_last_name,
        updated_at = now();

  -- Link user to player
  update public.players
  set user_id = p_user_id, updated_at = now()
  where id = v_player_id;

  -- Mark invite as used
  update public.player_invites
  set used_at = now()
  where token = p_token;
end;
$$;
