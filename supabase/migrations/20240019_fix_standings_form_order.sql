-- ============================================================
-- Migration 019 — fix get_standings form order (recent → oldest)
-- ============================================================

create or replace function public.get_standings(p_season_id uuid)
returns table (
  team_id     uuid,
  team_name   text,
  team_color  text,
  team_logo   text,
  played      integer,
  won         integer,
  drawn       integer,
  lost        integer,
  goals_for   integer,
  goals_against integer,
  goal_diff   integer,
  points      integer,
  form        text
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_pts_win   integer;
  v_pts_draw  integer;
  v_pts_loss  integer;
begin
  select
    coalesce(s.points_win,  3),
    coalesce(s.points_draw, 1),
    coalesce(s.points_loss, 0)
  into v_pts_win, v_pts_draw, v_pts_loss
  from public.settings s
  where s.season_id = p_season_id;

  if not found then
    v_pts_win  := 3;
    v_pts_draw := 1;
    v_pts_loss := 0;
  end if;

  return query
  with completed_matches as (
    select
      m.id,
      m.home_team_id,
      m.away_team_id,
      m.home_score,
      m.away_score,
      coalesce(m.played_at, m.updated_at) as match_time
    from public.matches m
    where m.season_id = p_season_id
      and m.status    = 'completed'
      and m.home_score is not null
      and m.away_score is not null
  ),
  team_results as (
    select
      home_team_id as tid,
      home_score   as gf,
      away_score   as ga,
      case
        when home_score > away_score then v_pts_win
        when home_score = away_score then v_pts_draw
        else                              v_pts_loss
      end as pts,
      case
        when home_score > away_score then 'W'
        when home_score = away_score then 'D'
        else                              'L'
      end as result,
      match_time
    from completed_matches
    union all
    select
      away_team_id,
      away_score,
      home_score,
      case
        when away_score > home_score then v_pts_win
        when away_score = home_score then v_pts_draw
        else                              v_pts_loss
      end,
      case
        when away_score > home_score then 'W'
        when away_score = home_score then 'D'
        else                              'L'
      end,
      match_time
    from completed_matches
  ),
  team_stats as (
    select
      tid,
      count(*)::integer                                  as played,
      count(*) filter (where result = 'W')::integer      as won,
      count(*) filter (where result = 'D')::integer      as drawn,
      count(*) filter (where result = 'L')::integer      as lost,
      coalesce(sum(gf), 0)::integer                      as goals_for,
      coalesce(sum(ga), 0)::integer                      as goals_against,
      coalesce(sum(gf) - sum(ga), 0)::integer            as goal_diff,
      coalesce(sum(pts), 0)::integer                     as points
    from team_results
    group by tid
  ),
  team_form as (
    select
      tid,
      -- FIX: order desc so form reads most-recent first (e.g. 'W,W,L,D,W')
      string_agg(result, ',' order by match_time desc) as form_full
    from (
      select
        tid,
        result,
        match_time,
        row_number() over (partition by tid order by match_time desc) as rn
      from team_results
    ) ranked
    where rn <= 5
    group by tid
  )
  select
    t.id                          as team_id,
    t.name                        as team_name,
    t.color                       as team_color,
    t.logo_url                    as team_logo,
    coalesce(ts.played, 0)        as played,
    coalesce(ts.won, 0)           as won,
    coalesce(ts.drawn, 0)         as drawn,
    coalesce(ts.lost, 0)          as lost,
    coalesce(ts.goals_for, 0)     as goals_for,
    coalesce(ts.goals_against, 0) as goals_against,
    coalesce(ts.goal_diff, 0)     as goal_diff,
    coalesce(ts.points, 0)        as points,
    coalesce(tf.form_full, '')    as form
  from public.teams t
  left join team_stats ts on ts.tid = t.id
  left join team_form  tf on tf.tid = t.id
  where t.season_id = p_season_id
  order by
    coalesce(ts.points, 0)      desc,
    coalesce(ts.goal_diff, 0)   desc,
    coalesce(ts.goals_for, 0)   desc,
    t.name                      asc;
end;
$$;
