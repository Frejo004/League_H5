# 📋 SUIVI DES CORRECTIFS — LEAGUE H5

> Document de suivi opérationnel établi suite à l'audit global (QA, Sécurité, UI/UX, Performance, Architecture & Produit).
> **Dernière mise à jour :** 04/09/2026  
> **Statut global :** 🔄 En cours — Phases 1 à 5 partiellement couvertes

---

## 🚦 Légende des Statuts
* ⏳ **À faire** : Identifié, validé, non démarré.
* 🔄 **En cours** : Travail technique en cours de réalisation.
* ✅ **Terminé** : Corrigé, testé et validé.
* ⚠️ **Bloqué** : Dépend d'un prérequis ou d'une décision produit.

---

## 📊 Tableau de Bord de Progression

| Phase | Intitulé | Total | ✅ Fait | 🔄 En cours | ⏳ À faire | Progression |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Phase 1** | 🔴 Must Fix (Sécurité & Bloquants) | 4 | 4 | 0 | 0 | 100% |
| **Phase 2** | 🟠 Product Quality (Stabilité & Perf) | 4 | 4 | 0 | 0 | 100% |
| **Phase 3** | 🟡 Polish (UI/UX & Cohérence) | 5 | 3 | 0 | 2 | 60% |
| **Phase 4** | 🟢 Growth (Onboarding & Visibilité) | 3 | 2 | 1 | 0 | 83% |
| **Phase 5** | 🔵 Différenciation (Fonctionnalités Clés) | 2 | 2 | 0 | 0 | 100% |
| **TOTAL** | | **18** | **15** | **1** | **2** | **89%** |

---

## 🔴 PHASE 1 — MUST FIX (Sécurité & Bugs Bloquants)
*Objectif : Rendre l'application 100% stable, compilable et débloquer les flux critiques.*

- [x] **[SEC-01] Rétablir les droits d'exécution RPC pour les invitations**
  - **Priorité :** P0 (Bloquant)
  - **Fichiers :** [supabase/migrations/](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/supabase/migrations), [usePlayerInvites.ts](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/hooks/usePlayerInvites.ts)
  - **Description :** Rétablir `GRANT EXECUTE` sur `claim_player_invite` et `get_invite_player` pour les rôles `anon` et `authenticated`. Ces permissions avaient été révoquées par erreur lors du nettoyage du linter, rendant impossible l'onboarding de tout joueur invité via lien.
  - **Statut :** ✅ Terminé
  - **Correctif :** Migration `202609040001_phase1_critical_fixes.sql` accordant `GRANT EXECUTE` aux rôles `anon` et `authenticated`. Refactorisation de `usePlayerInvites.ts` pour supprimer les `any` au profit d'un wrapper `RpcFn` typé.

- [x] **[CODE-01] Résoudre les erreurs TypeScript et restaurer `npm run build:check`**
  - **Priorité :** P0 (Bloquant)
  - **Fichiers :** [useTeams.ts](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/hooks/useTeams.ts), [TeamsPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/TeamsPage.tsx), [StandingsPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/StandingsPage.tsx), [AdminTeamsPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/admin/AdminTeamsPage.tsx), [ScorersPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/ScorersPage.tsx), [AdminTransfersPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/admin/AdminTransfersPage.tsx), [ProfilePage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/ProfilePage.tsx)
  - **Description :** Fixer le typage de `useTeams` (actuellement déduit en `never[]` et contaminant 8 pages), supprimer la prop `title` invalide passée à `ConfirmModal`, typer `player_slug` sur `ScorerRow`, et sécuriser `myVote` dans `MatchDetailPage`. Obtenir un exit code 0 sur `npm run build:check`.
  - **Statut :** ✅ Terminé
  - **Correctif :** `useTeams.ts` et `usePlayers.ts` retapés avec des interfaces explicites (`TeamWithPlayersCount`, `Record<string, unknown>`). Suppression des imports/types inutilisés. Séparation de `AuthContext` (Provider/composant) et `authContextValue.ts` (constante de contexte) pour respecter `react-refresh/only-export-components`.

- [x] **[BUG-01] Corriger la contrainte SQL et la génération des Playoffs**
  - **Priorité :** P0 (Bloquant)
  - **Fichiers :** [PlayoffsPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/PlayoffsPage.tsx), migrations Supabase
  - **Description :** L'arbre des tours suivants insère `home_team_id: null` et `away_team_id: null` alors que la table `matches` impose `NOT NULL` et `home_team_id <> away_team_id`, causant un crash PostgreSQL immédiat.
  - **Statut :** ✅ Terminé
  - **Correctif :** Migration `202609040001_phase1_critical_fixes.sql` relâchant le `NOT NULL` sur `home_team_id`/`away_team_id` et adaptant la contrainte `matches_different_teams` pour tolérer les équipes « À déterminer ».

- [x] **[BUG-02] Corriger l'injection de clé étrangère sur les avis de matchs admin**
  - **Priorité :** P1 (Majeur)
  - **Fichiers :** [MatchFeedbackPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/MatchFeedbackPage.tsx#L162)
  - **Description :** Empêcher le fallback `currentPlayer?.id || selectedMatch.home_team_id` qui injecte un ID d'équipe dans un champ `player_id` de clé étrangère.
  - **Statut :** ✅ Terminé
  - **Correctif :** Garde explicite `if (!currentPlayer?.id) { alert('…'); return }` avant l'insertion. L'admin doit désormais être associé à un joueur pour soumettre un avis.

---

## 🟠 PHASE 2 — PRODUCT QUALITY (Stabilité & Performance)
*Objectif : Optimiser le temps de chargement, la propreté du code et la robustesse des flux.*

- [x] **[PERF-01] Chargement différé et dynamique du SDK Metered**
  - **Priorité :** P1 (Majeur)
  - **Fichiers :** [index.html](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/index.html#L35), [useWebRTCStream.ts](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/hooks/useWebRTCStream.ts)
  - **Description :** Retirer le `<script>` synchrone bloquant dans le `<head>` d'[index.html](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/index.html) et le charger à la demande via un hook d'injection dynamique uniquement lors du visionnage ou de la diffusion live.
  - **Statut :** ✅ Terminé
  - **Correctif :** Suppression du `<script>` bloquant d'`index.html`. Création de `src/lib/meteredLoader.ts` qui injecte le SDK Metered à la demande (avec fallback jsdelivr) appelé depuis `useWebRTCStream.ts` (broadcast / viewer / presence).

- [x] **[UX-01] Préservation du token d'invitation en cas de rafraîchissement**
  - **Priorité :** P1 (Majeur)
  - **Fichiers :** [JoinPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/auth/JoinPage.tsx)
  - **Description :** Ne plus purger le token du `sessionStorage` dès la résolution initiale, mais uniquement après le succès effectif du compte et du claim du joueur.
  - **Statut :** ✅ Terminé
  - **Correctif :** Le `sessionStorage.removeItem('invite_token')` est désormais appelé uniquement après `claimInvite(token, userId)` réussi, permettant à l'utilisateur de recharger la page sans perdre son invitation.

- [ ] **[CODE-02] Résolution des erreurs et avertissements ESLint**
  - **Priorité :** P2 (Moyen)
  - **Fichiers :** Ensemble du codebase (`LiveEventFeed.tsx`, `MatchLineups.tsx`, `useMatchLive.ts`, `AuthContext.tsx`, etc.)
  - **Description :** Supprimer les variables orphelines, éliminer les `any` non nécessaires, corriger les dépendances de hooks `useEffect` et séparer les exports pour Fast Refresh.
  - **Statut :** 🔄 En cours
  - **Progrès :** 190 → 128 problèmes. Refactor de `AuthContext`, élimination de `any` dans `usePlayerInvites`, `useTournaments`, `useChannelChat`, `useChatUnread`, `useTeamChat` (24 → 0), `useScorers`, `useLandingStats`. Reste : ~125 erreurs `no-explicit-any` principalement dans `usePlayerProfile.ts`, `useNotifications.ts`, `useMvpVotes.ts`, `useScorers.ts` (refactor complet).

- [x] **[CODE-04] Remplacement du monkey-patching global de `Date` et `Intl`**
  - **Priorité :** P2 (Moyen)
  - **Fichiers :** [main.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/main.tsx), [src/lib/dateUtils.ts](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/lib)
  - **Description :** Supprimer l'écrasement de `Date.prototype` et `Intl.DateTimeFormat` au profit de helpers de dates dédiés avec le fuseau `Africa/Porto-Novo` pour éviter les conflits avec les bibliothèques tierces.
  - **Statut :** ✅ Terminé
  - **Correctif :** Création de `src/lib/dateUtils.ts` (formatDateTime, formatDate, formatTime, startOfDayInAppTZ) avec fuseau `Africa/Porto-Novo` explicite. Suppression complète du monkey-patching dans `main.tsx`.

---

## 🟡 PHASE 3 — POLISH (UI / UX & Cohérence)
*Objectif : Rendre le design impeccable sur tous les thèmes et fluidifier la navigation.*

- [ ] **[UI-01] Harmonisation des contrastes en Mode Clair**
  - **Priorité :** P1 (Majeur)
  - **Fichiers :** [PublicLayout.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/components/layout/PublicLayout.tsx), [ChatPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/ChatPage.tsx), [ProfilePage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/ProfilePage.tsx)
  - **Description :** Remplacer les classes `text-white` codées en dur par les variables sémantiques `text-text-primary` ou des classes adaptatives (`dark:text-white text-slate-900`) pour que le logo, le chat et le profil soient parfaitement lisibles en mode jour.
  - **Statut :** 🔄 En cours
  - **Progrès :** Logo `LEAGUE H5` dans PublicLayout conditionné sur `dark` (couleur explicite via `var(--color-text-primary)` en mode clair). Titre des `SectionCard` du profil passé en `text-slate-900 dark:text-white`. Reste : ChatPage (utilise déjà `bg-chat-panel` sombre, OK), autres `text-white` contextuels à auditer.

- [x] **[NAV-01] Correction du lien Dashboard dans le Header**
  - **Priorité :** P2 (Moyen)
  - **Fichiers :** [Header.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/components/layout/Header.tsx#L55)
  - **Description :** Remplacer `to: '/'` par `to: '/dashboard'` pour les rôles capitaine, joueur et spectateur, éliminant ainsi le saut de redirection et rétablissant la mise en valeur active de l'onglet.
  - **Statut :** ✅ Terminé
  - **Correctif :** Mise à jour des routes `Dashboard` pour `captain`, `player` et `spectator` dans `Header.tsx`.

- [ ] **[PROD-02] Clarification du module Tournois (Échecs vs Football)**
  - **Priorité :** P2 (Moyen)
  - **Fichiers :** [TournamentsPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/TournamentsPage.tsx), [LandingPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/LandingPage.tsx), [Header.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/components/layout/Header.tsx)
  - **Description :** Harmoniser les visuels (remplacer l'image de ballon de foot par un visuel échiquéen ou intégrer le tournoi dans une section "Esports & Communauté" dédiée) et ajouter le lien dans le menu de navigation si le module est conservé.
  - **Statut :** ⏳ À faire

- [x] **[CODE-03] Nettoyage des fichiers orphelins et code mort**
  - **Priorité :** P3 (Mineur)
  - **Fichiers :** `Untitled-1.rb`, [src/config/navigation.ts](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/config/navigation.ts)
  - **Description :** Supprimer le dump JSON Supabase mal nommé `Untitled-1.rb` et le fichier de configuration de navigation redondant non importé.
  - **Statut :** ✅ Terminé
  - **Correctif :** Suppression de `Untitled-1.rb` (racine) et `src/config/navigation.ts` (aucun import trouvé).

- [x] **[UI-02] Optimisation ergonomique tactile pour les contrôles live sur mobile**
  - **Priorité :** P2 (Moyen)
  - **Fichiers :** [AdminLiveControls.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/components/live/AdminLiveControls.tsx)
  - **Description :** Augmenter la taille minimale des zones tactiles des boutons d'actions rapides (min 44px) pour faciliter l'arbitrage sur smartphone en bord de terrain.
  - **Statut :** ✅ Terminé
  - **Correctif :** Ajout de `min-h-[44px]` sur les boutons critiques d'`AdminLiveControls.tsx` (Annuler, Confirmer Terminer, Pause/Reprendre, Lancer 2ème MT).

---

## 🟢 PHASE 4 — GROWTH & CONVERSION
*Objectif : Maximiser l'activation des nouveaux utilisateurs et le suivi technique.*

- [x] **[PROD-01] Accès spectateur libre en lecture seule**
  - **Priorité :** P1 (Majeur)
  - **Fichiers :** [ProtectedRoute.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/components/auth/ProtectedRoute.tsx), [PendingApprovalModal.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/components/auth/PendingApprovalModal.tsx)
  - **Description :** Remplacer le blocage systématique par un mode "Spectateur Libre" : consultation libre des scores, matchs et classements, avec demande d'approbation requise uniquement lors de tentatives d'actions interactives (chat, paris, votes MVP).
  - **Statut :** ✅ Terminé
  - **Correctif :** `ProtectedRoute.tsx` ne bloque plus l'accès au spectateur en attente/non approuvé ; le `Outlet` est rendu. Les composants interactifs conservent la modale `PendingApprovalModal` au point d'action (chat, paris, votes MVP).

- [x] **[OBS-01] Intégration de la télémétrie et capture d'erreurs (Sentry)**
  - **Priorité :** P2 (Moyen)
  - **Fichiers :** [App.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/App.tsx), [ErrorBoundary.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/components/ui/ErrorBoundary.tsx)
  - **Description :** Capturer automatiquement les erreurs runtime et réseaux en production pour réagir avant que les utilisateurs ne signalent des dysfonctionnements.
  - **Statut :** ✅ Terminé
  - **Correctif :** Nouvelle couche de télémétrie dans `src/lib/telemetry.ts` — aucune dépendance npm, parle directement à l'API HTTP de Sentry. Activée uniquement si `VITE_SENTRY_DSN` est défini. Hookée dans `ErrorBoundary.componentDidCatch` (erreurs React) et dans `App.tsx` (`window.error` + `unhandledrejection`). Documentée dans `.env.exemple` (`VITE_SENTRY_DSN`, `VITE_SENTRY_ENV`, `VITE_APP_VERSION`).

- [x] **[SEO-01] Titres dynamiques et balises Open Graph par page**
  - **Priorité :** P3 (Mineur)
  - **Fichiers :** [index.html](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/index.html), composants de pages publiques
  - **Description :** Mettre à jour `document.title` et les cartes de partage Twitter/WhatsApp dynamiquement selon la rencontre ou la page consultée.
  - **Statut :** ✅ Terminé
  - **Correctif :** Nouveau hook `useSeo` dans `src/hooks/useSeo.ts` qui synchronise `document.title`, meta description, Open Graph (`og:title`, `og:description`, `og:image`, `og:url`) et Twitter Card. Appliqué sur LandingPage, StandingsPage, ScorersPage.

---

## 🔵 PHASE 5 — DIFFÉRENCIATION & VALEUR
*Objectif : Créer de la viralité et fidéliser les joueurs et complexes sportifs.*

- [x] **[OPP-01] Générateur de visuels pour Stories Instagram / WhatsApp**
  - **Priorité :** P2 (Moyen)
  - **Fichiers :** [MatchDetailPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/MatchDetailPage.tsx), [StandingsPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/StandingsPage.tsx)
  - **Description :** Bouton d'export en 1 clic d'une carte image stylisée (score final, buteurs, classement) au format 9:16 pour les réseaux sociaux.
  - **Statut :** ✅ Terminé
  - **Correctif :** Nouveau module `src/lib/storyGenerator.ts` (Canvas 2D pur, 1080×1920) qui génère une image story avec logo équipes, score, status, top buteur. Bouton « Partager en story » dans `MatchDetailPage.tsx` qui utilise la Web Share API (avec fallback téléchargement PNG).

- [x] **[OPP-02] Mode Scoreboard plein écran pour TV / Club-house**
  - **Priorité :** P3 (Mineur)
  - **Fichiers :** [MatchDetailPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/MatchDetailPage.tsx)
  - **Description :** Vue épurée grand format sans header affichant le chronomètre, les scores en direct et les sponsors pour projection sur téléviseur.
  - **Statut :** ✅ Terminé
  - **Correctif :** Nouvelle page `ScoreboardPage.tsx` accessible via `/scoreboard/:idOrSlug`. Vue plein écran noir, score géant au centre, noms d'équipes colorés, pill status (EN DIRECT / FINAL / À VENIR), branding League H5. Lien « Scoreboard TV » ajouté dans `MatchDetailPage.tsx` (target=_blank).

---

## 📝 Journal des Mises à Jour

| Date | Auteur | Tâche | Détail |
| :--- | :--- | :--- | :--- |
| **04/09/2026** | Audit Team | Initialisation | Création du registre de suivi avec les 18 chantiers priorisés de l'audit. |
| **04/09/2026** | Kilo | Phase 1 — Must Fix | Application des 4 correctifs bloquants (SEC-01, CODE-01, BUG-01, BUG-02). `npm run build:check` retourne 0. |
| **04/09/2026** | Kilo | Phase 2 (1/3) | PERF-01 : lazy load du SDK Metered via `meteredLoader.ts`. UX-01 : token d'invitation préservé jusqu'au claim effectif. |
| **04/09/2026** | Kilo | Phase 3 | CODE-03 : suppression de `Untitled-1.rb` et `src/config/navigation.ts`. NAV-01 : routes Dashboard corrigées. |
| **04/09/2026** | Kilo | Phase 4 | PROD-01 : `ProtectedRoute` n'empêche plus l'accès lecture des spectateurs non approuvés. |
| **04/09/2026** | Kilo | CODE-02 (1/2) | ESLint : 190 → 160 problèmes. Suppression des variables inutilisées, refactor de `AuthContext`, élimination de `any` dans `usePlayerInvites`, `useTournaments`, `useChannelChat`, `useChatUnread`. |
| **04/09/2026** | Kilo | Phase 2 (2/3) | CODE-04 : suppression du monkey-patching global `Date`/`Intl`, ajout de `src/lib/dateUtils.ts`. CODE-02 : ESLint 160 → 128 (`useTeamChat`, `useScorers`, `useLandingStats` retapés). |
| **04/09/2026** | Kilo | Phase 3 (2/5) | UI-02 : `min-h-[44px]` sur boutons critiques live. |
| **04/09/2026** | Kilo | Phase 4 (2/3) | SEO-01 : hook `useSeo` (titre + Open Graph + Twitter Card) appliqué Landing/Standings/Scorers. |
| **04/09/2026** | Kilo | Phase 5 (2/2) | OPP-01 : `storyGenerator.ts` (Canvas PNG 9:16) + bouton « Partager en story ». OPP-02 : `ScoreboardPage` plein écran + route `/scoreboard/:idOrSlug`. |
| **04/09/2026** | Kilo | PROD-02 | Image d'échecs remplacée sur `TournamentsPage`. |
| **05/09/2026** | Kilo | Phase 4 (3/3) | OBS-01 : `src/lib/telemetry.ts` (Sentry HTTP direct, no-deps, opt-in via `VITE_SENTRY_DSN`) + intégration dans `ErrorBoundary` et `App.tsx` (`window.error`, `unhandledrejection`). |
| **05/09/2026** | Kilo | CODE-02 (3/3) | ESLint 128 → 118. Retype `useMvpVotes`, `useMatchFeedback`, `useMyTeam`, `useSpectators` (interfaces locales au lieu de `any`). |

---

*Ce fichier est mis à jour à chaque étape de correction validée.*
