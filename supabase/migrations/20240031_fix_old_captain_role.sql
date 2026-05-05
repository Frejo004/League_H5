-- ============================================================
-- Migration 031 — Corriger le rôle de l'ancien capitaine
--
-- Problème : Quand un nouveau capitaine est désigné, l'ancien
-- capitaine garde son rôle 'captain' dans la table profiles,
-- ce qui lui permet de garder les permissions de capitaine.
--
-- Solution : Modifier set_team_captain() pour rétrograder
-- l'ancien capitaine au rôle 'player' avant de promouvoir
-- le nouveau capitaine.
-- ============================================================

create or replace function public.set_team_captain(
  p_team_id         uuid,
  p_captain_player_id uuid,   -- player_id du capitaine désigné (peut être null)
  p_captain_user_id   uuid    -- user_id du capitaine si compte existant (peut être null)
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_old_captain_id uuid;
begin
  -- Vérifie que l'appelant est admin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Permission refusée : seul un administrateur peut désigner un capitaine.';
  end if;

  -- Récupère l'ancien captain_id de l'équipe
  select captain_id into v_old_captain_id
  from public.teams
  where id = p_team_id;

  -- Si un ancien capitaine existe et qu'il est différent du nouveau
  if v_old_captain_id is not null and v_old_captain_id != p_captain_user_id then
    -- Rétrograder l'ancien capitaine au rôle 'player'
    -- (sauf s'il est admin, dans ce cas on garde son rôle admin)
    update public.profiles
    set role = 'player', updated_at = now()
    where id = v_old_captain_id
      and role = 'captain';  -- Ne modifier que si le rôle est 'captain'
  end if;

  -- Met à jour l'équipe avec le nouveau capitaine
  update public.teams
  set
    captain_id        = p_captain_user_id,
    captain_player_id = p_captain_player_id,
    updated_at        = now()
  where id = p_team_id;

  -- Si le nouveau capitaine a déjà un compte, promouvoir son rôle à 'captain'
  -- (sauf s'il est déjà admin)
  if p_captain_user_id is not null then
    update public.profiles
    set role = 'captain', updated_at = now()
    where id = p_captain_user_id
      and role != 'admin';  -- Ne pas rétrograder un admin
  end if;
end;
$$;

-- La fonction est déjà accessible via le grant de la migration 025
-- Pas besoin de re-grant
