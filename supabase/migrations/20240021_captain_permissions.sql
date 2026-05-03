-- ============================================================
-- Migration 021 — Captain permissions
-- Le capitaine peut :
--   • Lire les joueurs de son équipe
--   • Créer/lire/supprimer des invitations pour les joueurs de son équipe
-- ============================================================

-- ── player_invites : le capitaine peut gérer les invitations de son équipe ──

-- Le capitaine peut créer une invitation pour un joueur de son équipe
create policy "player_invites: captain insert"
  on public.player_invites for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.players pl
      join public.teams t on t.id = pl.team_id
      where pl.id = player_invites.player_id
        and t.captain_id = auth.uid()
    )
  );

-- Le capitaine peut lire les invitations des joueurs de son équipe
create policy "player_invites: captain select"
  on public.player_invites for select
  to authenticated
  using (
    -- L'admin ou le créateur de l'invitation peut la voir
    created_by = auth.uid()
    or exists (
      select 1
      from public.players pl
      join public.teams t on t.id = pl.team_id
      where pl.id = player_invites.player_id
        and t.captain_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Le capitaine peut supprimer (révoquer) les invitations de son équipe
create policy "player_invites: captain delete"
  on public.player_invites for delete
  to authenticated
  using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.players pl
      join public.teams t on t.id = pl.team_id
      where pl.id = player_invites.player_id
        and t.captain_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ── teams : l'admin peut définir le capitaine ────────────────────────────────
-- (la policy "admin update" sur teams doit déjà exister via useUpdateTeam)
-- On s'assure que le capitaine peut lire sa propre équipe (déjà couvert par select public)

-- ── profiles : le capitaine peut lire les profils pour afficher les noms ─────
-- (déjà couvert par "profiles: authenticated read")
