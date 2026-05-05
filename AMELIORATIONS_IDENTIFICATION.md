# Améliorations d'identification des équipes et capitaines

## Fonctionnalités ajoutées ✨

### 1. Identification de l'équipe du joueur connecté

**Nouveau hook : `useMyTeam`**
- Localisation : `src/hooks/useMyTeam.ts`
- Fonction : Récupère automatiquement l'équipe du joueur connecté
- Retourne :
  - `myTeamId` : ID de l'équipe du joueur
  - `myTeam` : Informations complètes de l'équipe
  - `myPlayer` : Informations du joueur connecté

**Pages modifiées :**

#### Page Classement (`StandingsPage.tsx`)
- Badge **"Mon équipe"** affiché à côté du nom de l'équipe du joueur
- Bordure gauche colorée (primary-500) pour mettre en évidence la ligne
- Fond légèrement coloré (primary-600/5) pour distinguer visuellement

#### Page Équipes (`TeamsPage.tsx`)
- Badge **"Mon équipe"** affiché dans la carte de l'équipe du joueur
- Bordure gauche colorée pour identification rapide
- Fond légèrement coloré pour mise en évidence

---

### 2. Identification des capitaines d'équipe

**Indicateurs visuels ajoutés :**

#### Page Joueurs (`PlayersPage.tsx`)
- **Icône couronne** (Crown) sur l'avatar du capitaine
  - Petite couronne jaune en bas à droite de l'avatar
  - Bordure pour contraste avec le fond
- Badge **"Capitaine"** à côté du nom
  - Couleur jaune (yellow-500) pour visibilité
  - Texte petit (9px) pour ne pas encombrer

#### Page Détail d'équipe (`TeamDetailPage.tsx`)
- **Icône couronne** sur l'avatar du capitaine dans la liste des joueurs
- Badge **"Capitaine"** à côté du nom du joueur
- Mise en évidence visuelle cohérente avec la page des joueurs

---

## Détails techniques 🔧

### Hook `useMyTeam`

```typescript
export function useMyTeam(seasonId?: string) {
  const { profile } = useAuth()
  const { data: players } = usePlayers(seasonId)
  const { data: teams } = useTeams(seasonId)

  // Trouve le joueur correspondant au profil connecté
  const myPlayer = players?.find(p => p.user_id === profile?.id)
  
  // Trouve l'équipe du joueur
  const myTeam = teams?.find(t => t.id === myPlayer?.team_id)

  return {
    myTeamId: myPlayer?.team_id ?? null,
    myTeam: myTeam ?? null,
    myPlayer: myPlayer ?? null,
  }
}
```

### Identification du capitaine

Le capitaine est identifié via le champ `captain_player_id` de la table `teams` :

```typescript
const teamWithCaptain = team as TeamWithCaptain
const isCaptain = teamWithCaptain.captain_player_id === player.id
```

---

## Styles et design 🎨

### Badge "Mon équipe"
```css
bg-primary-600/20        /* Fond bleu semi-transparent */
text-primary-400         /* Texte bleu clair */
border-primary-600/30    /* Bordure bleue */
text-[9px]              /* Texte très petit */
px-1.5 py-0.5           /* Padding compact */
```

### Badge "Capitaine"
```css
bg-yellow-500/20         /* Fond jaune semi-transparent */
text-yellow-400          /* Texte jaune clair */
border-yellow-500/30     /* Bordure jaune */
text-[9px]              /* Texte très petit */
px-1.5 py-0.5           /* Padding compact */
```

### Icône couronne
```css
w-3.5 h-3.5             /* Taille petite (PlayersPage) */
w-4 h-4                 /* Taille légèrement plus grande (TeamDetailPage) */
bg-yellow-500           /* Fond jaune vif */
rounded-full            /* Forme circulaire */
border-surface-card     /* Bordure pour contraste */
```

### Mise en évidence de l'équipe
```css
bg-primary-600/5                    /* Fond bleu très léger */
border-l-2 border-l-primary-500/50  /* Bordure gauche bleue */
```

---

## Fichiers modifiés 📝

### Nouveaux fichiers
- `src/hooks/useMyTeam.ts` - Hook pour récupérer l'équipe du joueur connecté

### Fichiers modifiés
- `src/pages/StandingsPage.tsx` - Ajout badge "Mon équipe" dans le classement
- `src/pages/TeamsPage.tsx` - Ajout badge "Mon équipe" dans la liste des équipes
- `src/pages/PlayersPage.tsx` - Ajout icône couronne et badge "Capitaine"
- `src/pages/TeamDetailPage.tsx` - Ajout icône couronne et badge "Capitaine" dans l'effectif

---

## Comportement 🎯

### Pour les joueurs
- Quand un joueur est connecté, son équipe est automatiquement mise en évidence
- Le badge "Mon équipe" apparaît uniquement pour le joueur connecté
- Si le joueur n'a pas d'équipe assignée, aucun badge n'apparaît

### Pour les capitaines
- L'icône couronne apparaît sur tous les avatars des capitaines
- Le badge "Capitaine" est visible à côté du nom
- Ces indicateurs sont visibles par tous les utilisateurs (pas seulement le capitaine lui-même)

### Pour les spectateurs et admins
- Les spectateurs voient les badges "Capitaine" mais pas "Mon équipe" (ils n'ont pas d'équipe)
- Les admins voient tous les indicateurs normalement

---

## Tests recommandés ✅

### Test 1 : Identification de l'équipe
1. Se connecter en tant que joueur
2. Aller sur la page Classement
3. Vérifier que le badge "Mon équipe" apparaît sur la bonne équipe
4. Aller sur la page Équipes
5. Vérifier que le badge "Mon équipe" apparaît sur la bonne équipe

### Test 2 : Identification du capitaine
1. Aller sur la page Joueurs
2. Vérifier que l'icône couronne apparaît sur l'avatar du capitaine
3. Vérifier que le badge "Capitaine" apparaît à côté du nom
4. Cliquer sur une équipe pour voir les détails
5. Vérifier que le capitaine est bien identifié dans la liste des joueurs

### Test 3 : Changement de capitaine
1. En tant qu'admin, changer le capitaine d'une équipe
2. Vérifier que l'ancien capitaine perd ses badges
3. Vérifier que le nouveau capitaine reçoit les badges

### Test 4 : Utilisateurs sans équipe
1. Se connecter en tant que spectateur
2. Vérifier qu'aucun badge "Mon équipe" n'apparaît
3. Vérifier que les badges "Capitaine" sont toujours visibles

---

## Notes d'implémentation 💡

### Performance
- Le hook `useMyTeam` utilise les données déjà chargées par `usePlayers` et `useTeams`
- Pas de requête supplémentaire à la base de données
- Calcul léger effectué côté client

### Accessibilité
- Les icônes couronne ont un `strokeWidth={3}` pour meilleure visibilité
- Les badges ont un contraste suffisant pour être lisibles
- Les couleurs sont cohérentes avec le design system de l'application

### Responsive
- Les badges s'adaptent automatiquement à la taille de l'écran
- L'icône couronne reste visible sur mobile
- Pas de débordement de texte grâce à `truncate` et `shrink-0`

---

## Améliorations futures possibles 🚀

1. **Tooltip sur l'icône couronne** : Afficher "Capitaine" au survol
2. **Animation** : Ajouter une animation subtile sur le badge "Mon équipe"
3. **Filtre** : Permettre de filtrer les joueurs par capitaine
4. **Statistiques** : Afficher des stats spécifiques pour les capitaines
5. **Notification** : Notifier un joueur quand il devient capitaine
