-- ============================================================
-- Migration : correction de deux régressions RLS introduites par
-- 202606230004_fix_rls_performance.sql
-- ============================================================

-- ── 1. TRANSFERS ──────────────────────────────────────────────
-- La consolidation des policies avait restreint l'UPDATE aux seuls
-- admins, alors que src/hooks/useTransfers.ts (approveAsHomeCaptain,
-- approveAsAwayCaptain, rejectTransfer, utilisés depuis CaptainPage.tsx)
-- fait des .update() directs en tant que capitaine : ces appels
-- échouaient silencieusement sous RLS. On rétablit l'accès capitaine,
-- mais cette fois correctement scopé à l'équipe concernée par le
-- transfert (from_team_id ou to_team_id), au lieu de "n'importe quel
-- capitaine peut modifier n'importe quel transfert" comme dans la
-- version d'origine (202606070002_transfers.sql).
DROP POLICY IF EXISTS "transfers: update" ON public.transfers;
CREATE POLICY "transfers: update"
  ON public.transfers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.captain_id = (select auth.uid())
        AND (t.id = transfers.from_team_id OR t.id = transfers.to_team_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.captain_id = (select auth.uid())
        AND (t.id = transfers.from_team_id OR t.id = transfers.to_team_id)
    )
  );

-- ── 2. MATCH_LINEUPS ──────────────────────────────────────────
-- La "consolidation" avait supprimé les policies FOR ALL d'origine
-- (admin + capitaine) et ne les avait remplacées que par des policies
-- FOR INSERT : il n'existait donc plus AUCUNE policy SELECT/UPDATE/
-- DELETE. Conséquence directe : useMatchLineups() (src/hooks/useLineups.ts)
-- fait un SELECT direct sur la table et ne recevait plus jamais de
-- ligne (erreur RLS avalée silencieusement, retour []) — les
-- compositions d'équipe ne s'affichaient plus nulle part.
-- Les compositions sont une donnée publique (au même titre que les
-- scores/buts), donc lecture ouverte à tous ; écriture (UPDATE/DELETE,
-- utilisés par update_match_lineup() qui fait un DELETE+INSERT) réservée
-- à l'admin et au capitaine de l'équipe concernée, comme pour l'INSERT.
CREATE POLICY "match_lineups: public read"
  ON public.match_lineups FOR SELECT
  USING (true);

CREATE POLICY "match_lineups: admin update"
  ON public.match_lineups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "match_lineups: captain update"
  ON public.match_lineups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = match_lineups.team_id
      AND teams.captain_id = (select auth.uid())
    )
  );

CREATE POLICY "match_lineups: admin delete"
  ON public.match_lineups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "match_lineups: captain delete"
  ON public.match_lineups FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = match_lineups.team_id
      AND teams.captain_id = (select auth.uid())
    )
  );
