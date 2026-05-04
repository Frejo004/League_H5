-- ============================================================
-- Migration 025 — Sécuriser la désignation du capitaine
--
-- Problème : la policy "teams: captain update own" permet à un
-- capitaine de modifier n'importe quel champ de son équipe,
-- y compris captain_id, ce qui lui permettrait de s'attribuer
-- le contrôle d'une autre équipe.
--
-- Solution : remplacer la policy par une fonction security definer
-- qui vérifie que l'appelant est admin avant toute modification
-- de captain_id / captain_player_id.
-- ============================================================

-- ── Supprimer la policy captain trop large ───────────────────────────────────
drop policy if exists "teams: captain update own" on public.teams;

-- ── Fonction sécurisée pour désigner un capitaine (admin only) ───────────────
create or replace function public.set_team_captain(
  p_team_id         uuid,
  p_captain_player_id uuid,   -- player_id du capitaine désigné (peut être null)
  p_captain_user_id   uuid    -- user_id du capitaine si compte existant (peut être null)
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  -- Vérifie que l'appelant est admin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Permission refusée : seul un administrateur peut désigner un capitaine.';
  end if;

  -- Met à jour l'équipe
  update public.teams
  set
    captain_id        = p_captain_user_id,
    captain_player_id = p_captain_player_id,
    updated_at        = now()
  where id = p_team_id;

  -- Si le joueur a déjà un compte, promouvoir son rôle à 'captain'
  if p_captain_user_id is not null then
    update public.profiles
    set role = 'captain', updated_at = now()
    where id = p_captain_user_id;
  end if;
end;
$$;

-- Accorder l'exécution aux utilisateurs authentifiés
-- (la vérification admin est faite à l'intérieur)
grant execute on function public.set_team_captain(uuid, uuid, uuid) to authenticated;
