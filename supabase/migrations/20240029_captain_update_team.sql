-- ============================================================
-- Migration 029 — Restaurer les droits de modification du capitaine
--
-- La migration 025 a supprimé "teams: captain update own" pour
-- empêcher le capitaine de modifier captain_id.
-- On recrée une policy restrictive qui lui permet uniquement de
-- modifier name et logo_url (pas les champs sensibles).
-- Couvre aussi le cas où captain_id est renseigné via captain_player_id.
-- ============================================================

-- Le capitaine peut modifier le nom et le logo de son équipe
create policy "teams: captain update name and logo"
  on public.teams for update
  to authenticated
  using (
    -- Cas 1 : captain_id directement renseigné
    captain_id = auth.uid()
    or
    -- Cas 2 : capitaine désigné via captain_player_id (son player.user_id = auth.uid())
    exists (
      select 1 from public.players p
      where p.id = teams.captain_player_id
        and p.user_id = auth.uid()
    )
  )
  with check (
    captain_id = auth.uid()
    or
    exists (
      select 1 from public.players p
      where p.id = teams.captain_player_id
        and p.user_id = auth.uid()
    )
  );
