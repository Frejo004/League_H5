-- Modification de l'expiration par défaut des invitations joueurs
-- On passe de 1 heure à 7 jours pour donner un délai réaliste aux joueurs pour s'inscrire.

ALTER TABLE public.player_invites 
ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days');

-- Optionnel: prolonge également toutes les invitations actives existantes à 7 jours à partir de maintenant
UPDATE public.player_invites
SET expires_at = now() + interval '7 days'
WHERE used_at IS NULL AND expires_at > now();
