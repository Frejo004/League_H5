-- ============================================================
-- Migration 036 — chat_enhancements
-- Typing indicators, pinned messages, mentions
-- ============================================================

-- Table des indicateurs de saisie (typing)
create table public.chat_typing (
  user_id    uuid    not null references public.profiles(id) on delete cascade,
  team_id    uuid    not null references public.teams(id) on delete cascade,
  started_at timestamptz not null default now(),
  primary key (user_id, team_id)
);

create index chat_typing_team_idx on public.chat_typing(team_id);

-- Table des messages épinglés (admin/capitaine uniquement)
create table public.team_pinned_messages (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null references public.teams(id) on delete cascade,
  message_id uuid not null references public.team_messages(id) on delete cascade,
  pinned_by  uuid not null references public.profiles(id) on delete cascade,
  pinned_at  timestamptz not null default now(),
  unique (team_id, message_id)
);

create index team_pinned_messages_team_idx on public.team_pinned_messages(team_id);

-- Table des mentions dans les messages
create table public.chat_mentions (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.team_messages(id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles(id) on delete cascade,
  mentioned_by uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (message_id, mentioned_user_id)
);

create index chat_mentions_user_idx on public.chat_mentions(mentioned_user_id);
create index chat_mentions_message_idx on public.chat_mentions(message_id);

-- Activer Realtime
alter publication supabase_realtime add table public.chat_typing;
alter publication supabase_realtime add table public.team_pinned_messages;
alter publication supabase_realtime add table public.chat_mentions;

-- ============================================================
-- RLS — chat_typing
-- ============================================================
alter table public.chat_typing enable row level security;

create policy "chat_typing: team members full access"
  on public.chat_typing for all
  to authenticated
  using (
    exists (
      select 1 from public.players
      where team_id = chat_typing.team_id
        and user_id = auth.uid()
        and is_active = true
    )
    or exists (
      select 1 from public.teams
      where id = chat_typing.team_id
        and captain_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (user_id = auth.uid());

-- ============================================================
-- RLS — team_pinned_messages
-- ============================================================
alter table public.team_pinned_messages enable row level security;

create policy "pinned: team members read"
  on public.team_pinned_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.players
      where team_id = team_pinned_messages.team_id
        and user_id = auth.uid()
        and is_active = true
    )
    or exists (
      select 1 from public.teams
      where id = team_pinned_messages.team_id
        and captain_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "pinned: captain/admin insert"
  on public.team_pinned_messages for insert
  to authenticated
  with check (
    pinned_by = auth.uid()
    and (
      exists (select 1 from public.teams where id = team_pinned_messages.team_id and captain_id = auth.uid())
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    )
  );

create policy "pinned: captain/admin delete"
  on public.team_pinned_messages for delete
  to authenticated
  using (
    exists (select 1 from public.teams where id = team_pinned_messages.team_id and captain_id = auth.uid())
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- RLS — chat_mentions
-- ============================================================
alter table public.chat_mentions enable row level security;

create policy "mentions: mentioned user read"
  on public.chat_mentions for select
  to authenticated
  using (
    mentioned_user_id = auth.uid()
    or exists (
      select 1 from public.team_messages tm
      where tm.id = chat_mentions.message_id
        and exists (
          select 1 from public.players p
          where p.team_id = tm.team_id
            and p.user_id = auth.uid()
            and p.is_active = true
        )
    )
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "mentions: team members insert"
  on public.chat_mentions for insert
  to authenticated
  with check (
    mentioned_by = auth.uid()
    and exists (
      select 1 from public.team_messages tm
      where tm.id = chat_mentions.message_id
        and exists (
          select 1 from public.players p
          where p.team_id = tm.team_id
            and p.user_id = auth.uid()
            and p.is_active = true
        )
    )
  );