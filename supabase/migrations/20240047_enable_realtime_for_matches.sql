-- Migration simplifiée et robuste pour activer le Realtime
-- SET TABLE remplace la liste actuelle, évitant les erreurs de doublons

ALTER PUBLICATION supabase_realtime SET TABLE 
  public.matches, 
  public.goals, 
  public.assists, 
  public.match_events;
