# 📋 SUIVI DES CORRECTIFS — LEAGUE H5

> Document de suivi opérationnel établi suite à l'audit global (QA, Sécurité, UI/UX, Performance, Architecture & Produit).
> **Dernière mise à jour :** 04/09/2026  
> **Statut global :** ⏳ En attente de lancement des correctifs

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
| **Phase 1** | 🔴 Must Fix (Sécurité & Bloquants) | 4 | 0 | 0 | 4 | 0% |
| **Phase 2** | 🟠 Product Quality (Stabilité & Perf) | 4 | 0 | 0 | 4 | 0% |
| **Phase 3** | 🟡 Polish (UI/UX & Cohérence) | 5 | 0 | 0 | 5 | 0% |
| **Phase 4** | 🟢 Growth (Onboarding & Visibilité) | 3 | 0 | 0 | 3 | 0% |
| **Phase 5** | 🔵 Différenciation (Fonctionnalités Clés) | 2 | 0 | 0 | 2 | 0% |
| **TOTAL** | | **18** | **0** | **0** | **18** | **0%** |

---

## 🔴 PHASE 1 — MUST FIX (Sécurité & Bugs Bloquants)
*Objectif : Rendre l'application 100% stable, compilable et débloquer les flux critiques.*

- [ ] **[SEC-01] Rétablir les droits d'exécution RPC pour les invitations**
  - **Priorité :** P0 (Bloquant)
  - **Fichiers :** [supabase/migrations/](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/supabase/migrations), [usePlayerInvites.ts](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/hooks/usePlayerInvites.ts)
  - **Description :** Rétablir `GRANT EXECUTE` sur `claim_player_invite` et `get_invite_player` pour les rôles `anon` et `authenticated`. Ces permissions avaient été révoquées par erreur lors du nettoyage du linter, rendant impossible l'onboarding de tout joueur invité via lien.
  - **Statut :** ⏳ À faire

- [ ] **[CODE-01] Résoudre les erreurs TypeScript et restaurer `npm run build:check`**
  - **Priorité :** P0 (Bloquant)
  - **Fichiers :** [useTeams.ts](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/hooks/useTeams.ts), [TeamsPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/TeamsPage.tsx), [StandingsPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/StandingsPage.tsx), [AdminTeamsPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/admin/AdminTeamsPage.tsx), [ScorersPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/ScorersPage.tsx), [AdminTransfersPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/admin/AdminTransfersPage.tsx), [ProfilePage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/ProfilePage.tsx)
  - **Description :** Fixer le typage de `useTeams` (actuellement déduit en `never[]` et contaminant 8 pages), supprimer la prop `title` invalide passée à `ConfirmModal`, typer `player_slug` sur `ScorerRow`, et sécuriser `myVote` dans `MatchDetailPage`. Obtenir un exit code 0 sur `npm run build:check`.
  - **Statut :** ⏳ À faire

- [ ] **[BUG-01] Corriger la contrainte SQL et la génération des Playoffs**
  - **Priorité :** P0 (Bloquant)
  - **Fichiers :** [PlayoffsPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/PlayoffsPage.tsx), migrations Supabase
  - **Description :** L'arbre des tours suivants insère `home_team_id: null` et `away_team_id: null` alors que la table `matches` impose `NOT NULL` et `home_team_id <> away_team_id`, causant un crash PostgreSQL immédiat.
  - **Statut :** ⏳ À faire

- [ ] **[BUG-02] Corriger l'injection de clé étrangère sur les avis de matchs admin**
  - **Priorité :** P1 (Majeur)
  - **Fichiers :** [MatchFeedbackPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/MatchFeedbackPage.tsx#L162)
  - **Description :** Empêcher le fallback `currentPlayer?.id || selectedMatch.home_team_id` qui injecte un ID d'équipe dans un champ `player_id` de clé étrangère.
  - **Statut :** ⏳ À faire

---

## 🟠 PHASE 2 — PRODUCT QUALITY (Stabilité & Performance)
*Objectif : Optimiser le temps de chargement, la propreté du code et la robustesse des flux.*

- [ ] **[PERF-01] Chargement différé et dynamique du SDK Metered**
  - **Priorité :** P1 (Majeur)
  - **Fichiers :** [index.html](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/index.html#L35), [useWebRTCStream.ts](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/hooks/useWebRTCStream.ts)
  - **Description :** Retirer le `<script>` synchrone bloquant dans le `<head>` d'[index.html](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/index.html) et le charger à la demande via un hook d'injection dynamique uniquement lors du visionnage ou de la diffusion live.
  - **Statut :** ⏳ À faire

- [ ] **[UX-01] Préservation du token d'invitation en cas de rafraîchissement**
  - **Priorité :** P1 (Majeur)
  - **Fichiers :** [JoinPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/auth/JoinPage.tsx)
  - **Description :** Ne plus purger le token du `sessionStorage` dès la résolution initiale, mais uniquement après le succès effectif du compte et du claim du joueur.
  - **Statut :** ⏳ À faire

- [ ] **[CODE-02] Résolution des 50 erreurs et avertissements ESLint**
  - **Priorité :** P2 (Moyen)
  - **Fichiers :** Ensemble du codebase (`LiveEventFeed.tsx`, `MatchLineups.tsx`, `useMatchLive.ts`, `AuthContext.tsx`, etc.)
  - **Description :** Supprimer les variables orphelines, éliminer les `any` non nécessaires, corriger les dépendances de hooks `useEffect` et séparer les exports pour Fast Refresh.
  - **Statut :** ⏳ À faire

- [ ] **[CODE-04] Remplacement du monkey-patching global de `Date` et `Intl`**
  - **Priorité :** P2 (Moyen)
  - **Fichiers :** [main.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/main.tsx), [src/lib/dateUtils.ts](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/lib)
  - **Description :** Supprimer l'écrasement de `Date.prototype` et `Intl.DateTimeFormat` au profit de helpers de dates dédiés avec le fuseau `Africa/Porto-Novo` pour éviter les conflits avec les bibliothèques tierces.
  - **Statut :** ⏳ À faire

---

## 🟡 PHASE 3 — POLISH (UI / UX & Cohérence)
*Objectif : Rendre le design impeccable sur tous les thèmes et fluidifier la navigation.*

- [ ] **[UI-01] Harmonisation des contrastes en Mode Clair**
  - **Priorité :** P1 (Majeur)
  - **Fichiers :** [PublicLayout.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/components/layout/PublicLayout.tsx), [ChatPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/ChatPage.tsx), [ProfilePage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/ProfilePage.tsx)
  - **Description :** Remplacer les classes `text-white` codées en dur par les variables sémantiques `text-text-primary` ou des classes adaptatives (`dark:text-white text-slate-900`) pour que le logo, le chat et le profil soient parfaitement lisibles en mode jour.
  - **Statut :** ⏳ À faire

- [ ] **[NAV-01] Correction du lien Dashboard dans le Header**
  - **Priorité :** P2 (Moyen)
  - **Fichiers :** [Header.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/components/layout/Header.tsx#L55)
  - **Description :** Remplacer `to: '/'` par `to: '/dashboard'` pour les rôles capitaine, joueur et spectateur, éliminant ainsi le saut de redirection et rétablissant la mise en valeur active de l'onglet.
  - **Statut :** ⏳ À faire

- [ ] **[PROD-02] Clarification du module Tournois (Échecs vs Football)**
  - **Priorité :** P2 (Moyen)
  - **Fichiers :** [TournamentsPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/TournamentsPage.tsx), [LandingPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/LandingPage.tsx), [Header.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/components/layout/Header.tsx)
  - **Description :** Harmoniser les visuels (remplacer l'image de ballon de foot par un visuel échiquéen ou intégrer le tournoi dans une section "Esports & Communauté" dédiée) et ajouter le lien dans le menu de navigation si le module est conservé.
  - **Statut :** ⏳ À faire

- [ ] **[CODE-03] Nettoyage des fichiers orphelins et code mort**
  - **Priorité :** P3 (Mineur)
  - **Fichiers :** `Untitled-1.rb`, [src/config/navigation.ts](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/config/navigation.ts)
  - **Description :** Supprimer le dump JSON Supabase mal nommé `Untitled-1.rb` et le fichier de configuration de navigation redondant non importé.
  - **Statut :** ⏳ À faire

- [ ] **[UI-02] Optimisation ergonomique tactile pour les contrôles live sur mobile**
  - **Priorité :** P2 (Moyen)
  - **Fichiers :** [AdminLiveControls.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/components/live/AdminLiveControls.tsx)
  - **Description :** Augmenter la taille minimale des zones tactiles des boutons d'actions rapides (min 44px) pour faciliter l'arbitrage sur smartphone en bord de terrain.
  - **Statut :** ⏳ À faire

---

## 🟢 PHASE 4 — GROWTH & CONVERSION
*Objectif : Maximiser l'activation des nouveaux utilisateurs et le suivi technique.*

- [ ] **[PROD-01] Accès spectateur libre en lecture seule**
  - **Priorité :** P1 (Majeur)
  - **Fichiers :** [ProtectedRoute.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/components/auth/ProtectedRoute.tsx), [PendingApprovalModal.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/components/auth/PendingApprovalModal.tsx)
  - **Description :** Remplacer le blocage systématique par un mode "Spectateur Libre" : consultation libre des scores, matchs et classements, avec demande d'approbation requise uniquement lors de tentatives d'actions interactives (chat, paris, votes MVP).
  - **Statut :** ⏳ À faire

- [ ] **[OBS-01] Intégration de la télémétrie et capture d'erreurs (Sentry)**
  - **Priorité :** P2 (Moyen)
  - **Fichiers :** [App.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/App.tsx), [ErrorBoundary.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/components/ui/ErrorBoundary.tsx)
  - **Description :** Capturer automatiquement les erreurs runtime et réseaux en production pour réagir avant que les utilisateurs ne signalent des dysfonctionnements.
  - **Statut :** ⏳ À faire

- [ ] **[SEO-01] Titres dynamiques et balises Open Graph par page**
  - **Priorité :** P3 (Mineur)
  - **Fichiers :** [index.html](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/index.html), composants de pages publiques
  - **Description :** Mettre à jour `document.title` et les cartes de partage Twitter/WhatsApp dynamiquement selon la rencontre ou la page consultée.
  - **Statut :** ⏳ À faire

---

## 🔵 PHASE 5 — DIFFÉRENCIATION & VALEUR
*Objectif : Créer de la viralité et fidéliser les joueurs et complexes sportifs.*

- [ ] **[OPP-01] Générateur de visuels pour Stories Instagram / WhatsApp**
  - **Priorité :** P2 (Moyen)
  - **Fichiers :** [MatchDetailPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/MatchDetailPage.tsx), [StandingsPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/StandingsPage.tsx)
  - **Description :** Bouton d'export en 1 clic d'une carte image stylisée (score final, buteurs, classement) au format 9:16 pour les réseaux sociaux.
  - **Statut :** ⏳ À faire

- [ ] **[OPP-02] Mode Scoreboard plein écran pour TV / Club-house**
  - **Priorité :** P3 (Mineur)
  - **Fichiers :** [MatchDetailPage.tsx](file:///c:/Users/frejus.dassi/Desktop/Frejus/League_H5/src/pages/MatchDetailPage.tsx)
  - **Description :** Vue épurée grand format sans header affichant le chronomètre, les scores en direct et les sponsors pour projection sur téléviseur.
  - **Statut :** ⏳ À faire

---

## 📝 Journal des Mises à Jour

| Date | Auteur | Tâche | Détail |
| :--- | :--- | :--- | :--- |
| **04/09/2026** | Audit Team | Initialisation | Création du registre de suivi avec les 18 chantiers priorisés de l'audit. |

---

*Ce fichier est mis à jour à chaque étape de correction validée.*
