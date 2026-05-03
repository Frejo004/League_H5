-- ============================================================
-- Migration 018 — restrict mvp_votes to completed matches
-- ============================================================

drop policy "mvp_votes: authenticated insert" on public.mvp_votes;

create policy "mvp_votes: authenticated insert"
  on public.mvp_votes for insert
  to authenticated
  with check (
    voted_by = auth.uid()
    and exists (
      select 1 from public.matches
      where id = match_id and status = 'completed'
    )
  );
