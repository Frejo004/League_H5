-- ============================================================
-- Migration 026 — get_scorers RPC
-- Calcule le classement des buteurs/passeurs côté serveur,
-- cohérent avec get_standings (même pattern).
-- ============================================================

create or replace function public.get_scorers(p_season_id uuid)
returns table (
  player_id   uuid,
  first_name  text,
  last_name   text,
  team_id     uuid,
  team_name   text,
  team_color  text,
  goals       integer,
  assists     integer,
  own_goals   integer
)
language sql stable security definer set search_path = public as $$
  select
    p.id                                                          as player_id,
    p.first_name,
    p.last_name,
    p.team_id,
    t.name                                                        as team_name,
    t.color                                                       as team_color,
    count(g.id) filter (where g.id is not null and not g.is_own_goal)::integer  as goals,
    count(a.id)::integer                                          as assists,
    count(g.id) filter (where g.id is not null and g.is_own_goal)::integer      as own_goals
  from public.players p
  join public.teams t on t.id = p.team_id
  -- Jointure sur les buts de la saison uniquement
  left join public.goals g
    on  g.player_id = p.id
    and g.match_id in (
      select id from public.matches
      where season_id = p_season_id
        and status = 'completed'
    )
  -- Jointure sur les passes de la saison uniquement
  left join public.assists a
    on  a.player_id = p.id
    and a.match_id in (
      select id from public.matches
      where season_id = p_season_id
        and status = 'completed'
    )
  where p.season_id = p_season_id
    and p.is_active = true
  group by p.id, p.first_name, p.last_name, p.team_id, t.name, t.color
  having
    count(g.id) filter (where g.id is not null) > 0
    or count(a.id) > 0
  order by
    goals desc,
    assists desc,
    p.last_name asc;
$$;

grant execute on function public.get_scorers(uuid) to authenticated;
