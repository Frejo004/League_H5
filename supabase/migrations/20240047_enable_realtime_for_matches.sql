-- Migration: Activer le Realtime pour la table matches
-- Permet aux spectateurs de voir les changements de score, de période et de chrono (mi-temps) en temps réel.

ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assists;
