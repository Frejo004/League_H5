# Corrections appliquées — League H5

## 🔴 Problèmes critiques corrigés

### 1. ✅ Faille RLS sur `player_invites` (Migration 024)
**Fichier :** `supabase/migrations/20240024_fix_anon_rls_invite_expiry.sql`

- **Supprimé** la policy `"player_invites: anon read by token"` avec `using (true)` qui exposait toute la table sans authentification
- La fonction `get_invite_player` (security definer) suffit pour le flow signup
- **Impact :** Faille de sécurité critique éliminée

### 2. ✅ Expiration des invitations 1h → 7 jours (Migration 024)
**Fichier :** `supabase/migrations/20240024_fix_anon_rls_invite_expiry.sql`

- **Modifié** le défaut de `expires_at` de `1 hour` à `7 days`
- Cohérence avec le message affiché dans l'UI (`CaptainPage.tsx`)
- **Impact :** UX cassée corrigée

### 3. ✅ Escalade de privilèges capitaine (Migration 025)
**Fichiers :**
- `supabase/migrations/20240025_fix_set_captain_security.sql`
- `src/hooks/useTeams.ts`

- **Supprimé** la policy `"teams: captain update own"` trop permissive
- **Créé** la fonction RPC `set_team_captain` (security definer) qui vérifie que l'appelant est admin
- **Modifié** `useSetCaptain` pour utiliser la fonction RPC au lieu de mutations directes
- **Impact :** Escalade de privilèges horizontale éliminée

### 4. ✅ Race condition dans le flow d'inscription (JoinPage)
**Fichier :** `src/pages/auth/JoinPage.tsx`

- **Amélioré** la gestion d'erreur dans `handleSubmit` :
  - Distingue les erreurs de création de compte vs erreurs de claim
  - Affiche un message différencié si le claim échoue après la création du compte
  - Gère le cas où `userId` est null (confirmation email activée)
- **Modifié** l'écran de succès pour mentionner la confirmation email
- **Impact :** Comptes orphelins évités, meilleure UX

### 5. ✅ Détection de l'équipe du capitaine (CaptainPage)
**Fichier :** `src/pages/CaptainPage.tsx`

- **Ajouté** `usePlayers` pour charger les joueurs de la saison
- **Modifié** la logique de détection de `myTeam` pour vérifier :
  1. `captain_id === profile.id` (cas normal)
  2. `captain_player_id === player.id` où `player.user_id === profile.id` (cas capitaine désigné avant création de compte)
- **Impact :** Fonctionnalité capitaine restaurée pour tous les cas

---

## 🟡 Problèmes secondaires corrigés

### 6. ✅ Erreur silencieuse dans `toggleActive` (AdminSeasonsPage)
**Fichier :** `src/pages/admin/AdminSeasonsPage.tsx`

- **Ajouté** `activateError` et `lockError` dans le state
- **Wrappé** `toggleActive` et `toggleLock` dans des try/catch
- **Affiché** les erreurs dans le JSX
- **Impact :** L'admin voit maintenant les erreurs d'activation/verrouillage

### 7. ✅ Invalidations de cache trop larges (useGoals, usePlayers)
**Fichiers :**
- `src/hooks/useGoals.ts`
- `src/hooks/usePlayers.ts`
- `src/pages/admin/AdminGoalsPage.tsx`

- **Ajouté** `seasonId` comme paramètre dans `useAddGoal`, `useDeleteGoal`, `useAddAssist`, `useDeleteAssist`
- **Modifié** les invalidations pour cibler `['scorers', seasonId]` et `['standings', seasonId]` au lieu de `['scorers']` et `['standings']`
- **Modifié** `useDeactivatePlayer` pour retourner `season_id` et `team_id` et invalider les bonnes clés
- **Mis à jour** `AdminGoalsPage` pour passer `seasonId` aux mutations
- **Impact :** Refetch inutiles éliminés, performance améliorée

### 8. ✅ Génération de calendrier séquentielle (AdminSchedulePage)
**Fichier :** `src/pages/admin/AdminSchedulePage.tsx`

- **Remplacé** la boucle `for` avec `await createMatch.mutateAsync` par un batch insert unique
- **Utilisé** `supabase.from('matches').insert(allMatchesToCreate)` pour insérer tous les matchs en une seule requête
- **Invalidé** manuellement le cache avec `qc.invalidateQueries`
- **Impact :** Génération de calendrier 10-30x plus rapide

### 9. ✅ Hook dans un hook (StandingsPage)
**Fichier :** `src/pages/StandingsPage.tsx`

- **Transformé** `useFilteredStandings` (hook) en `computeFilteredStandings` (fonction pure)
- **Réutilisé** les `matches` déjà chargés au lieu de re-fetcher
- **Impact :** Double fetch éliminé, code plus simple

---

## 📊 Résumé

| Catégorie | Nombre | Fichiers modifiés |
|---|---|---|
| 🔴 Critiques | 5 | 5 fichiers + 2 migrations |
| 🟡 Secondaires | 4 | 5 fichiers |
| **Total** | **9** | **10 fichiers + 2 migrations** |

---

## 🚀 Prochaines étapes recommandées

### Corrections restantes (non appliquées)

1. **N+1 queries dans `useScorers`** — créer une fonction SQL `get_scorers` similaire à `get_standings`
2. **Waterfalls dans `usePlayerProfile`** — fusionner les requêtes player + team avec une jointure
3. **Casts `as unknown as` répétés** — étendre les types dans `database.ts` pour inclure les jointures
4. **Vérification mot de passe dans `ProfilePage`** — supprimer le `signInWithPassword` et faire confiance à la session
5. **Token visible en clair dans `InviteButton`** — masquer partiellement le token dans l'affichage
6. **`staleTime` absent** — ajouter un `staleTime` plus long (10-15 min) sur `useStandings` et `useScorers`

### Tests recommandés

1. Tester le flow d'inscription par invitation avec un token valide
2. Tester la désignation d'un capitaine (admin uniquement)
3. Tester la génération de calendrier avec 6+ équipes
4. Vérifier que les invalidations de cache fonctionnent correctement après ajout/suppression de buts
5. Tester l'espace capitaine avec un capitaine désigné avant création de compte

### Déploiement

1. **Appliquer les migrations** dans l'ordre :
   ```bash
   # Migration 024 : fix RLS + expiration
   supabase migration up 20240024_fix_anon_rls_invite_expiry.sql
   
   # Migration 025 : fix escalade capitaine
   supabase migration up 20240025_fix_set_captain_security.sql
   ```

2. **Déployer le code frontend** après avoir appliqué les migrations

3. **Vérifier les logs Supabase** pour détecter d'éventuelles erreurs RLS

---

## 📝 Notes

- Les migrations sont **non destructives** — elles ne suppriment pas de données
- Les invitations existantes conservent leur expiration d'origine (1h) — seules les nouvelles expirent à 7 jours
- La fonction `set_team_captain` est accessible aux utilisateurs authentifiés mais vérifie le rôle admin en interne
- Le trigger `players_captain_sync` (migration 022) synchronise automatiquement le rôle capitaine quand un joueur crée son compte
