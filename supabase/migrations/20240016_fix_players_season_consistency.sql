-- ============================================================
-- Migration 016 — enforce players.season_id = teams.season_id
-- ============================================================

-- Add FK-based consistency check via trigger (CHECK constraints
-- cannot reference other tables in PostgreSQL)
create or replace function public.check_player_season_matches_team()
returns trigger language plpgsql as $$
begin
  if (select season_id from public.teams where id = new.team_id) <> new.season_id then
    raise exception 'players.season_id must match teams.season_id';
  end if;
  return new;
end;
$$;

create trigger players_season_consistency
  before insert or update of team_id, season_id on public.players
  for each row execute function public.check_player_season_matches_team();
