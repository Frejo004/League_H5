-- ============================================================
-- Migration 040 — Aperçus des canaux globaux avec dernier message
-- ============================================================

-- Retourne les canaux visibles par l'utilisateur courant
-- avec le dernier message et sa date (pour le tri chronologique)

create or replace function public.get_channel_previews()
returns table (
  id              uuid,
  slug            text,
  name            text,
  description     text,
  color           text,
  icon            text,
  is_read_only    boolean,
  created_at      timestamptz,
  last_message    text,
  last_message_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  with last_msgs as (
    select distinct on (cm.channel_id)
      cm.channel_id,
      cm.content    as last_message,
      cm.created_at as last_message_at
    from channel_messages cm
    order by cm.channel_id, cm.created_at desc
  )
  select
    gc.id,
    gc.slug,
    gc.name,
    gc.description,
    gc.color,
    gc.icon,
    gc.is_read_only,
    gc.created_at,
    lm.last_message,
    lm.last_message_at
  from global_channels gc
  left join last_msgs lm on lm.channel_id = gc.id
  order by coalesce(lm.last_message_at, gc.created_at) desc;
$$;
