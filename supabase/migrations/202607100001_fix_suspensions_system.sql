-- ============================================================
-- FIX SUSPENSIONS SYSTEM
-- 1. Ajouter la colonne is_auto_generated manquante
-- 2. Corriger le trigger red_card → suspension
-- 3. Corriger les RLS policies conflictuelles
-- 4. Créer les suspensions rétroactives pour les cartons rouges existants
-- ============================================================

-- 1. Ajouter la colonne is_auto_generated si elle n'existe pas
ALTER TABLE public.suspensions
  ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT false;

-- 2. Mettre à jour le trigger pour inclure is_auto_generated
CREATE OR REPLACE FUNCTION public.handle_red_card_suspension()
RETURNS TRIGGER AS $$
DECLARE
    v_season_id UUID;
BEGIN
    IF NEW.type = 'red_card' AND NEW.player_id IS NOT NULL THEN
        -- Récupérer la saison du match
        SELECT season_id INTO v_season_id FROM public.matches WHERE id = NEW.match_id;

        -- Ne pas créer de doublon si une suspension auto existe déjà pour ce match+joueur
        IF NOT EXISTS (
            SELECT 1 FROM public.suspensions
            WHERE player_id = NEW.player_id
              AND match_id_trigger = NEW.match_id
              AND is_auto_generated = true
        ) THEN
            INSERT INTO public.suspensions (
                player_id, season_id, match_id_trigger,
                reason, matches_count, matches_served,
                is_active, is_auto_generated
            )
            VALUES (
                NEW.player_id,
                v_season_id,
                NEW.match_id,
                'Carton Rouge Direct — ' || NEW.minute || '''',
                1, 0, true, true
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger
DROP TRIGGER IF EXISTS tr_red_card_suspension ON public.match_events;
CREATE TRIGGER tr_red_card_suspension
AFTER INSERT ON public.match_events
FOR EACH ROW EXECUTE FUNCTION public.handle_red_card_suspension();

-- 3. Corriger les RLS policies (supprimer le FOR ALL qui bloque le SELECT)
DROP POLICY IF EXISTS "Suspensions consultables par tous" ON public.suspensions;
DROP POLICY IF EXISTS "Suspensions gérables par les admins" ON public.suspensions;

-- SELECT : tout le monde authentifié peut lire
CREATE POLICY "suspensions_select_all"
ON public.suspensions FOR SELECT
TO authenticated
USING (true);

-- INSERT : admins et trigger SECURITY DEFINER
CREATE POLICY "suspensions_insert_admin"
ON public.suspensions FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- UPDATE : admins uniquement
CREATE POLICY "suspensions_update_admin"
ON public.suspensions FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- DELETE : admins uniquement
CREATE POLICY "suspensions_delete_admin"
ON public.suspensions FOR DELETE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. Créer rétroactivement les suspensions manquantes pour les cartons rouges déjà insérés
-- On insère uniquement si aucune suspension auto n'existe déjà pour ce joueur+match
INSERT INTO public.suspensions (
    player_id, season_id, match_id_trigger,
    reason, matches_count, matches_served,
    is_active, is_auto_generated
)
SELECT DISTINCT
    me.player_id,
    m.season_id,
    me.match_id,
    'Carton Rouge Direct — ' || me.minute || '''',
    1, 0, true, true
FROM public.match_events me
JOIN public.matches m ON m.id = me.match_id
WHERE me.type = 'red_card'
  AND me.player_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.suspensions s
      WHERE s.player_id = me.player_id
        AND s.match_id_trigger = me.match_id
        AND s.is_auto_generated = true
  );
