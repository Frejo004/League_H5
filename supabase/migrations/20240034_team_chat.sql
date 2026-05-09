-- ============================================================
-- Migration 034 — team_messages (group chat per team)
-- ============================================================

-- Activer Realtime sur les tables de chat
-- (nécessaire pour que postgres_changes fonctionne)
alter publication supabase_realtime add table public.team_messages;
alter publication supabase_realtime add table public.team_message_reactions;

-- Table principale des messages
create table public.team_messages (
  id            uuid        primary key default gen_random_uuid(),
  team_id       uuid        not null references public.teams(id) on delete cascade,
  sender_id     uuid        not null references public.profiles(id) on delete cascade,
  content       text        not null check (char_length(content) > 0 and char_length(content) <= 2000),
  reply_to_id   uuid        references public.team_messages(id) on delete set null,
  edited_at     timestamptz,
  created_at    timestamptz not null default now()
);

create index team_messages_team_idx   on public.team_messages(team_id, created_at desc);
create index team_messages_sender_idx on public.team_messages(sender_id);
create index team_messages_reply_idx  on public.team_messages(reply_to_id);

-- Table des réactions (emoji) sur les messages
create table public.team_message_reactions (
  id         uuid        primary key default gen_random_uuid(),
  message_id uuid        not null references public.team_messages(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  emoji      text        not null check (char_length(emoji) <= 10),
  created_at timestamptz not null default now(),
  -- Un utilisateur ne peut mettre qu'une fois le même emoji sur un message
  unique (message_id, user_id, emoji)
);

create index team_message_reactions_msg_idx on public.team_message_reactions(message_id);

-- ============================================================
-- RLS — team_messages
-- ============================================================
alter table public.team_messages enable row level security;

-- Lecture : membres de l'équipe (joueurs actifs) + admin
create policy "team_messages: team members read"
  on public.team_messages for select
  to authenticated
  using (
    -- Admin voit tout
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
    or
    -- Joueur actif de l'équipe
    exists (
      select 1 from public.players
      where team_id = team_messages.team_id
        and user_id = auth.uid()
        and is_active = true
    )
    or
    -- Capitaine de l'équipe
    exists (
      select 1 from public.teams
      where id = team_messages.team_id
        and captain_id = auth.uid()
    )
  );

-- Insertion : membres de l'équipe uniquement (sender_id = soi-même)
create policy "team_messages: team members insert"
  on public.team_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and (
      exists (
        select 1 from public.players
        where team_id = team_messages.team_id
          and user_id = auth.uid()
          and is_active = true
      )
      or
      exists (
        select 1 from public.teams
        where id = team_messages.team_id
          and captain_id = auth.uid()
      )
      or
      exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
    )
  );

-- Mise à jour : auteur uniquement (pour édition)
create policy "team_messages: author update"
  on public.team_messages for update
  to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

-- Suppression : auteur ou admin
create policy "team_messages: author or admin delete"
  on public.team_messages for delete
  to authenticated
  using (
    sender_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ============================================================
-- RLS — team_message_reactions
-- ============================================================
alter table public.team_message_reactions enable row level security;

-- Lecture : membres de l'équipe du message
create policy "reactions: team members read"
  on public.team_message_reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.team_messages tm
      join public.players p on p.team_id = tm.team_id
      where tm.id = team_message_reactions.message_id
        and p.user_id = auth.uid()
        and p.is_active = true
    )
    or
    exists (
      select 1 from public.team_messages tm
      join public.teams t on t.id = tm.team_id
      where tm.id = team_message_reactions.message_id
        and t.captain_id = auth.uid()
    )
    or
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Insertion : user_id = soi-même
create policy "reactions: team members insert"
  on public.team_message_reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and (
      exists (
        select 1 from public.team_messages tm
        join public.players p on p.team_id = tm.team_id
        where tm.id = team_message_reactions.message_id
          and p.user_id = auth.uid()
          and p.is_active = true
      )
      or
      exists (
        select 1 from public.team_messages tm
        join public.teams t on t.id = tm.team_id
        where tm.id = team_message_reactions.message_id
          and t.captain_id = auth.uid()
      )
      or
      exists (
        select 1 from public.profiles
        where id = auth.uid() and role = 'admin'
      )
    )
  );

-- Suppression : auteur de la réaction uniquement
create policy "reactions: author delete"
  on public.team_message_reactions for delete
  to authenticated
  using (user_id = auth.uid());
