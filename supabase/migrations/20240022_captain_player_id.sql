-- ============================================================
-- Migration 022 — Ajouter captain_player_id sur teams
-- Permet de désigner un capitaine par player_id même si le
-- joueur n'a pas encore créé son compte (user_id null).
-- captain_id (FK → profiles) reste pour les permissions RLS.
-- captain_player_id (FK → players) est la désignation admin.
-- ============================================================

alter table public.teams
  add column if not exists captain_player_id uuid
    references public.players(id) on delete set null;

create index if not exists teams_captain_player_idx
  on public.teams(captain_player_id);

-- Quand un joueur accepte une invitation (claim_player_invite),
-- si ce joueur est le captain_player_id de son équipe,
-- on met à jour captain_id avec son user_id et son rôle à 'captain'.
create or replace function public.sync_captain_on_claim()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Si le joueur vient d'être lié à un user_id
  if new.user_id is not null and old.user_id is null then
    -- Vérifie si ce joueur est le capitaine désigné de son équipe
    if exists (
      select 1 from public.teams
      where id = new.team_id
        and captain_player_id = new.id
    ) then
      -- Met à jour captain_id sur l'équipe
      update public.teams
        set captain_id = new.user_id
        where id = new.team_id;

      -- Met à jour le rôle du profil
      update public.profiles
        set role = 'captain'
        where id = new.user_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger players_captain_sync
  after update of user_id on public.players
  for each row execute function public.sync_captain_on_claim();
