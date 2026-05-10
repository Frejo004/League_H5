-- ============================================================
-- Migration 038 — Fonctions RPC pour les performances du chat
-- Remplace les N+1 queries côté client par des agrégations SQL
-- ============================================================

-- ── 1. get_dm_conversations_with_unread ──────────────────────────────────────
-- Retourne toutes les conversations DM de l'utilisateur courant avec :
--   - profil de l'autre participant
--   - dernier message (contenu + date)
--   - nombre de messages non lus
-- 1 seul appel au lieu de 3×N

create or replace function public.get_dm_conversations_with_unread()
returns table (
  id              uuid,
  user_a          uuid,
  user_b          uuid,
  created_at      timestamptz,
  other_id        uuid,
  other_full_name text,
  other_avatar    text,
  last_message    text,
  last_message_at timestamptz,
  unread_count    bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with me as (
    select auth.uid() as uid
  ),
  convs as (
    select
      dc.id,
      dc.user_a,
      dc.user_b,
      dc.created_at,
      case when dc.user_a = (select uid from me) then dc.user_b else dc.user_a end as other_id
    from dm_conversations dc
    where dc.user_a = (select uid from me)
       or dc.user_b = (select uid from me)
  ),
  last_msgs as (
    select distinct on (dm.conversation_id)
      dm.conversation_id,
      dm.content      as last_message,
      dm.created_at   as last_message_at
    from dm_messages dm
    where dm.conversation_id in (select id from convs)
    order by dm.conversation_id, dm.created_at desc
  ),
  receipts as (
    select
      drr.conversation_id,
      drr.last_read_at
    from dm_read_receipts drr
    where drr.user_id = (select uid from me)
      and drr.conversation_id in (select id from convs)
  ),
  unread as (
    select
      dm.conversation_id,
      count(*) as unread_count
    from dm_messages dm
    join convs c on c.id = dm.conversation_id
    left join receipts r on r.conversation_id = dm.conversation_id
    where dm.sender_id <> (select uid from me)
      and (r.last_read_at is null or dm.created_at > r.last_read_at)
    group by dm.conversation_id
  )
  select
    c.id,
    c.user_a,
    c.user_b,
    c.created_at,
    c.other_id,
    p.full_name   as other_full_name,
    p.avatar_url  as other_avatar,
    lm.last_message,
    lm.last_message_at,
    coalesce(u.unread_count, 0) as unread_count
  from convs c
  join profiles p on p.id = c.other_id
  left join last_msgs lm on lm.conversation_id = c.id
  left join unread u on u.conversation_id = c.id
  order by coalesce(lm.last_message_at, c.created_at) desc;
$$;

-- ── 2. get_team_unread_counts ────────────────────────────────────────────────
-- Retourne pour chaque équipe de l'utilisateur :
--   - infos équipe (nom, couleur, logo)
--   - dernier message
--   - nombre de messages non lus
-- 1 seul appel au lieu de 2×N

create or replace function public.get_team_unread_counts()
returns table (
  team_id         uuid,
  team_name       text,
  team_color      text,
  logo_url        text,
  last_message    text,
  last_message_at timestamptz,
  unread_count    bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with me as (
    select auth.uid() as uid
  ),
  my_teams as (
    -- Équipes via joueur actif
    select t.id, t.name, t.color, t.logo_url
    from players pl
    join teams t on t.id = pl.team_id
    where pl.user_id = (select uid from me)
      and pl.is_active = true
    union
    -- Équipes via capitaine
    select t.id, t.name, t.color, t.logo_url
    from teams t
    where t.captain_id = (select uid from me)
  ),
  last_msgs as (
    select distinct on (tm.team_id)
      tm.team_id,
      tm.content    as last_message,
      tm.created_at as last_message_at
    from team_messages tm
    where tm.team_id in (select id from my_teams)
    order by tm.team_id, tm.created_at desc
  ),
  receipts as (
    select
      crr.team_id,
      crr.last_read_at
    from chat_read_receipts crr
    where crr.user_id = (select uid from me)
      and crr.team_id in (select id from my_teams)
  ),
  unread as (
    select
      tm.team_id,
      count(*) as unread_count
    from team_messages tm
    left join receipts r on r.team_id = tm.team_id
    where tm.team_id in (select id from my_teams)
      and tm.sender_id <> (select uid from me)
      and (r.last_read_at is null or tm.created_at > r.last_read_at)
    group by tm.team_id
  )
  select
    mt.id           as team_id,
    mt.name         as team_name,
    mt.color        as team_color,
    mt.logo_url,
    lm.last_message,
    lm.last_message_at,
    coalesce(u.unread_count, 0) as unread_count
  from my_teams mt
  left join last_msgs lm on lm.team_id = mt.id
  left join unread u on u.team_id = mt.id
  order by coalesce(lm.last_message_at, now()) desc;
$$;

-- ── 3. get_team_unread_counts_admin ─────────────────────────────────────────
-- Version admin : toutes les équipes (pas de filtre membre)

create or replace function public.get_team_unread_counts_admin()
returns table (
  team_id         uuid,
  team_name       text,
  team_color      text,
  logo_url        text,
  last_message    text,
  last_message_at timestamptz,
  unread_count    bigint
)
language sql
security definer
stable
set search_path = public
as $$
  with me as (
    select auth.uid() as uid
  ),
  all_teams as (
    select t.id, t.name, t.color, t.logo_url from teams t
  ),
  last_msgs as (
    select distinct on (tm.team_id)
      tm.team_id,
      tm.content    as last_message,
      tm.created_at as last_message_at
    from team_messages tm
    order by tm.team_id, tm.created_at desc
  ),
  receipts as (
    select crr.team_id, crr.last_read_at
    from chat_read_receipts crr
    where crr.user_id = (select uid from me)
  ),
  unread as (
    select
      tm.team_id,
      count(*) as unread_count
    from team_messages tm
    left join receipts r on r.team_id = tm.team_id
    where tm.sender_id <> (select uid from me)
      and (r.last_read_at is null or tm.created_at > r.last_read_at)
    group by tm.team_id
  )
  select
    at2.id           as team_id,
    at2.name         as team_name,
    at2.color        as team_color,
    at2.logo_url,
    lm.last_message,
    lm.last_message_at,
    coalesce(u.unread_count, 0) as unread_count
  from all_teams at2
  left join last_msgs lm on lm.team_id = at2.id
  left join unread u on u.team_id = at2.id
  order by coalesce(lm.last_message_at, now()) desc;
$$;

-- ── 4. Pagination cursor-based pour les messages ─────────────────────────────
-- Compte le total de messages pour afficher "X messages plus anciens"

create or replace function public.count_channel_messages_before(
  p_channel_id uuid,
  p_before_id  uuid
)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)
  from channel_messages cm
  where cm.channel_id = p_channel_id
    and cm.created_at < (
      select created_at from channel_messages where id = p_before_id
    );
$$;

create or replace function public.count_dm_messages_before(
  p_conversation_id uuid,
  p_before_id       uuid
)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)
  from dm_messages dm
  where dm.conversation_id = p_conversation_id
    and dm.created_at < (
      select created_at from dm_messages where id = p_before_id
    );
$$;

create or replace function public.count_team_messages_before(
  p_team_id   uuid,
  p_before_id uuid
)
returns bigint
language sql
security definer
stable
set search_path = public
as $$
  select count(*)
  from team_messages tm
  where tm.team_id = p_team_id
    and tm.created_at < (
      select created_at from team_messages where id = p_before_id
    );
$$;
