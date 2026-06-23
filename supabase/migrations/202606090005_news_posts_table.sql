-- ============================================================
-- Migration — Table news_posts
-- Articles d'actualité publiés par l'admin par saison
-- ============================================================

create table if not exists public.news_posts (
  id          uuid primary key default gen_random_uuid(),
  season_id   uuid not null references public.seasons(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  title       text not null,
  content     text not null,
  image_url   text,
  is_pinned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index pour accélérer les requêtes par saison
create index if not exists idx_news_posts_season_id on public.news_posts(season_id);
create index if not exists idx_news_posts_created_at on public.news_posts(season_id, created_at desc);

-- Trigger updated_at
create or replace function public.set_news_posts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists news_posts_updated_at on public.news_posts;
create trigger news_posts_updated_at
  before update on public.news_posts
  for each row execute function public.set_news_posts_updated_at();

-- ── RLS ─────────────────────────────────────────────────────
alter table public.news_posts enable row level security;

-- Lecture publique (joueurs, spectateurs, anonymes)
drop policy if exists "news_posts: public read" on public.news_posts;
create policy "news_posts: public read"
  on public.news_posts for select
  to public
  using (true);

-- Insertion : admin seulement
drop policy if exists "news_posts: admin insert" on public.news_posts;
create policy "news_posts: admin insert"
  on public.news_posts for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Modification : admin seulement
drop policy if exists "news_posts: admin update" on public.news_posts;
create policy "news_posts: admin update"
  on public.news_posts for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Suppression : admin seulement
drop policy if exists "news_posts: admin delete" on public.news_posts;
create policy "news_posts: admin delete"
  on public.news_posts for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
