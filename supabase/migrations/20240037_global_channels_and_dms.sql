-- ============================================================
-- Migration 037 — Canaux globaux + Messages directs (DMs)
-- ============================================================

-- ── 1. Canaux globaux (Général, Capitaines & Admins) ─────────────────────────

create table public.global_channels (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        not null unique,          -- 'general' | 'captains'
  name        text        not null,
  description text,
  color       text        not null default '#3b82f6',
  icon        text        not null default '💬',
  is_read_only boolean    not null default false,   -- admin peut couper l'écriture
  created_at  timestamptz not null default now()
);

-- Insérer les deux canaux par défaut
insert into public.global_channels (slug, name, description, color, icon, is_read_only) values
  ('general',  'Général',            'Canal ouvert à tous les membres', '#16a34a', '🌍', false),
  ('captains', 'Capitaines & Admins','Canal réservé aux capitaines et administrateurs', '#f59e0b', '⚽', false);

-- ── 2. Messages dans les canaux globaux ──────────────────────────────────────

create table public.channel_messages (
  id           uuid        primary key default gen_random_uuid(),
  channel_id   uuid        not null references public.global_channels(id) on delete cascade,
  sender_id    uuid        not null references public.profiles(id) on delete cascade,
  content      text        not null check (char_length(content) > 0 and char_length(content) <= 2000),
  reply_to_id  uuid        references public.channel_messages(id) on delete set null,
  edited_at    timestamptz,
  created_at   timestamptz not null default now()
);

create index channel_messages_channel_idx on public.channel_messages(channel_id, created_at desc);
create index channel_messages_sender_idx  on public.channel_messages(sender_id);

-- Réactions sur les messages de canaux
create table public.channel_message_reactions (
  id         uuid        primary key default gen_random_uuid(),
  message_id uuid        not null references public.channel_messages(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  emoji      text        not null check (char_length(emoji) <= 10),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

create index channel_message_reactions_msg_idx on public.channel_message_reactions(message_id);

-- Read receipts pour les canaux globaux
create table public.channel_read_receipts (
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  channel_id    uuid        not null references public.global_channels(id) on delete cascade,
  last_read_at  timestamptz not null default now(),
  last_read_msg uuid        references public.channel_messages(id) on delete set null,
  updated_at    timestamptz not null default now(),
  primary key (user_id, channel_id)
);

create trigger channel_read_receipts_updated_at
  before update on public.channel_read_receipts
  for each row execute function public.set_updated_at();

-- ── 3. Messages directs (DMs) ─────────────────────────────────────────────────

-- Conversation entre deux utilisateurs
create table public.dm_conversations (
  id           uuid        primary key default gen_random_uuid(),
  user_a       uuid        not null references public.profiles(id) on delete cascade,
  user_b       uuid        not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  -- Garantit l'unicité de la paire (user_a < user_b)
  unique (user_a, user_b),
  check (user_a < user_b)
);

create index dm_conversations_user_a_idx on public.dm_conversations(user_a);
create index dm_conversations_user_b_idx on public.dm_conversations(user_b);

-- Messages dans une conversation DM
create table public.dm_messages (
  id           uuid        primary key default gen_random_uuid(),
  conversation_id uuid     not null references public.dm_conversations(id) on delete cascade,
  sender_id    uuid        not null references public.profiles(id) on delete cascade,
  content      text        not null check (char_length(content) > 0 and char_length(content) <= 2000),
  reply_to_id  uuid        references public.dm_messages(id) on delete set null,
  edited_at    timestamptz,
  created_at   timestamptz not null default now()
);

create index dm_messages_conv_idx    on public.dm_messages(conversation_id, created_at desc);
create index dm_messages_sender_idx  on public.dm_messages(sender_id);

-- Réactions sur les DMs
create table public.dm_message_reactions (
  id         uuid        primary key default gen_random_uuid(),
  message_id uuid        not null references public.dm_messages(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  emoji      text        not null check (char_length(emoji) <= 10),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

-- Read receipts pour les DMs
create table public.dm_read_receipts (
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  conversation_id uuid        not null references public.dm_conversations(id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  last_read_msg   uuid        references public.dm_messages(id) on delete set null,
  updated_at      timestamptz not null default now(),
  primary key (user_id, conversation_id)
);

create trigger dm_read_receipts_updated_at
  before update on public.dm_read_receipts
  for each row execute function public.set_updated_at();

-- ── 4. Realtime ───────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.channel_messages;
alter publication supabase_realtime add table public.channel_message_reactions;
alter publication supabase_realtime add table public.channel_read_receipts;
alter publication supabase_realtime add table public.dm_messages;
alter publication supabase_realtime add table public.dm_message_reactions;
alter publication supabase_realtime add table public.dm_read_receipts;
alter publication supabase_realtime add table public.global_channels;

-- ── 5. RLS — global_channels ─────────────────────────────────────────────────

alter table public.global_channels enable row level security;

-- Tout le monde peut lire les canaux (la visibilité est gérée côté app)
create policy "global_channels: authenticated read"
  on public.global_channels for select
  to authenticated using (true);

-- Seul l'admin peut modifier (is_read_only)
create policy "global_channels: admin update"
  on public.global_channels for update
  to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ── 6. RLS — channel_messages ────────────────────────────────────────────────

alter table public.channel_messages enable row level security;

-- Lecture canal "general" : tout utilisateur authentifié
-- Lecture canal "captains" : capitaines + admins uniquement
create policy "channel_messages: read"
  on public.channel_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.global_channels gc
      where gc.id = channel_id
      and (
        gc.slug = 'general'
        or (
          gc.slug = 'captains'
          and (
            exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
            or exists (select 1 from public.teams where captain_id = auth.uid())
          )
        )
      )
    )
  );

-- Écriture canal "general" : tout le monde sauf si is_read_only (admin peut toujours écrire)
create policy "channel_messages: insert general"
  on public.channel_messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.global_channels gc
      where gc.id = channel_id
      and gc.slug = 'general'
      and (
        gc.is_read_only = false
        or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
      )
    )
  );

-- Écriture canal "captains" : capitaines + admins
create policy "channel_messages: insert captains"
  on public.channel_messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.global_channels gc
      where gc.id = channel_id
      and gc.slug = 'captains'
      and (
        exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
        or exists (select 1 from public.teams where captain_id = auth.uid())
      )
    )
  );

-- Suppression : auteur ou admin
create policy "channel_messages: delete own or admin"
  on public.channel_messages for delete
  to authenticated
  using (
    sender_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Modification : auteur ou admin
create policy "channel_messages: update own or admin"
  on public.channel_messages for update
  to authenticated
  using (
    sender_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ── 7. RLS — channel_message_reactions ───────────────────────────────────────

alter table public.channel_message_reactions enable row level security;

create policy "channel_reactions: read"
  on public.channel_message_reactions for select
  to authenticated using (true);

create policy "channel_reactions: insert own"
  on public.channel_message_reactions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "channel_reactions: delete own"
  on public.channel_message_reactions for delete
  to authenticated
  using (user_id = auth.uid());

-- ── 8. RLS — channel_read_receipts ───────────────────────────────────────────

alter table public.channel_read_receipts enable row level security;

create policy "channel_receipts: read team"
  on public.channel_read_receipts for select
  to authenticated using (true);

create policy "channel_receipts: upsert own"
  on public.channel_read_receipts for insert
  to authenticated with check (user_id = auth.uid());

create policy "channel_receipts: update own"
  on public.channel_read_receipts for update
  to authenticated using (user_id = auth.uid());

-- ── 9. RLS — dm_conversations ────────────────────────────────────────────────

alter table public.dm_conversations enable row level security;

create policy "dm_conversations: read own"
  on public.dm_conversations for select
  to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

create policy "dm_conversations: insert"
  on public.dm_conversations for insert
  to authenticated
  with check (user_a = auth.uid() or user_b = auth.uid());

-- ── 10. RLS — dm_messages ────────────────────────────────────────────────────

alter table public.dm_messages enable row level security;

create policy "dm_messages: read participants"
  on public.dm_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.dm_conversations dc
      where dc.id = conversation_id
      and (dc.user_a = auth.uid() or dc.user_b = auth.uid())
    )
  );

create policy "dm_messages: insert participant"
  on public.dm_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.dm_conversations dc
      where dc.id = conversation_id
      and (dc.user_a = auth.uid() or dc.user_b = auth.uid())
    )
  );

create policy "dm_messages: delete own"
  on public.dm_messages for delete
  to authenticated
  using (sender_id = auth.uid());

create policy "dm_messages: update own"
  on public.dm_messages for update
  to authenticated
  using (sender_id = auth.uid());

-- ── 11. RLS — dm_message_reactions ───────────────────────────────────────────

alter table public.dm_message_reactions enable row level security;

create policy "dm_reactions: read"
  on public.dm_message_reactions for select
  to authenticated using (true);

create policy "dm_reactions: insert own"
  on public.dm_message_reactions for insert
  to authenticated with check (user_id = auth.uid());

create policy "dm_reactions: delete own"
  on public.dm_message_reactions for delete
  to authenticated using (user_id = auth.uid());

-- ── 12. RLS — dm_read_receipts ───────────────────────────────────────────────

alter table public.dm_read_receipts enable row level security;

create policy "dm_receipts: read participants"
  on public.dm_read_receipts for select
  to authenticated
  using (
    exists (
      select 1 from public.dm_conversations dc
      where dc.id = conversation_id
      and (dc.user_a = auth.uid() or dc.user_b = auth.uid())
    )
  );

create policy "dm_receipts: upsert own"
  on public.dm_read_receipts for insert
  to authenticated with check (user_id = auth.uid());

create policy "dm_receipts: update own"
  on public.dm_read_receipts for update
  to authenticated using (user_id = auth.uid());

-- ── 13. Fonction helper : get_or_create_dm_conversation ──────────────────────

create or replace function public.get_or_create_dm_conversation(other_user_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_user_a uuid;
  v_user_b uuid;
  v_conv_id uuid;
begin
  -- Toujours stocker user_a < user_b pour garantir l'unicité
  if auth.uid() < other_user_id then
    v_user_a := auth.uid();
    v_user_b := other_user_id;
  else
    v_user_a := other_user_id;
    v_user_b := auth.uid();
  end if;

  -- Chercher une conversation existante
  select id into v_conv_id
  from public.dm_conversations
  where user_a = v_user_a and user_b = v_user_b;

  -- Créer si elle n'existe pas
  if v_conv_id is null then
    insert into public.dm_conversations (user_a, user_b)
    values (v_user_a, v_user_b)
    returning id into v_conv_id;
  end if;

  return v_conv_id;
end;
$$;
