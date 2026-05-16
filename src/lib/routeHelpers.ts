/**
 * Utilitaires pour gérer les routes avec slugs et IDs
 */

/**
 * Vérifie si une chaîne est un UUID valide
 */
export function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

/**
 * Vérifie si une chaîne est un slug valide
 */
export function isSlug(str: string): boolean {
  // Un slug valide contient uniquement des lettres minuscules, chiffres et tirets
  // Ne commence ni ne finit par un tiret
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(str)
}

/**
 * Détermine si le paramètre de route est un ID ou un slug
 */
export function getRouteParamType(param: string): 'id' | 'slug' {
  return isUUID(param) ? 'id' : 'slug'
}

/**
 * Génère une URL pour une équipe (utilise le slug si disponible, sinon l'ID)
 */
export function getTeamUrl(team: { id: string; slug?: string }): string {
  return `/teams/${team.slug || team.id}`
}

/**
 * Génère une URL pour un joueur (utilise le slug si disponible, sinon l'ID)
 */
export function getPlayerUrl(player: { id: string; slug?: string }): string {
  return `/players/${player.slug || player.id}`
}

/**
 * Génère une URL pour un match (utilise le slug si disponible, sinon l'ID)
 */
export function getMatchUrl(match: { id: string; slug?: string }): string {
  return `/matches/${match.slug || match.id}`
}
