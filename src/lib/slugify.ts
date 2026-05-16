/**
 * Utilitaires pour générer et gérer des slugs URL-friendly
 */

/**
 * Convertit une chaîne en slug URL-friendly
 * @example slugify("Paris Saint-Germain") => "paris-saint-germain"
 * @example slugify("Équipe A") => "equipe-a"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    // Remplacer les caractères accentués
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remplacer les espaces et underscores par des tirets
    .replace(/[\s_]+/g, '-')
    // Supprimer les caractères non alphanumériques (sauf tirets)
    .replace(/[^\w-]+/g, '')
    // Remplacer les tirets multiples par un seul
    .replace(/--+/g, '-')
    // Supprimer les tirets au début et à la fin
    .replace(/^-+|-+$/g, '')
}

/**
 * Génère un slug unique pour une équipe
 * Format: nom-equipe ou nom-equipe-2 si collision
 */
export function generateTeamSlug(teamName: string, existingSlugs: string[] = []): string {
  const baseSlug = slugify(teamName)
  
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug
  }
  
  // Si le slug existe déjà, ajouter un suffixe numérique
  let counter = 2
  let newSlug = `${baseSlug}-${counter}`
  
  while (existingSlugs.includes(newSlug)) {
    counter++
    newSlug = `${baseSlug}-${counter}`
  }
  
  return newSlug
}

/**
 * Génère un slug unique pour un joueur
 * Format: prenom-nom ou prenom-nom-2 si collision
 */
export function generatePlayerSlug(
  firstName: string,
  lastName: string,
  existingSlugs: string[] = []
): string {
  const baseSlug = slugify(`${firstName}-${lastName}`)
  
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug
  }
  
  // Si le slug existe déjà, ajouter un suffixe numérique
  let counter = 2
  let newSlug = `${baseSlug}-${counter}`
  
  while (existingSlugs.includes(newSlug)) {
    counter++
    newSlug = `${baseSlug}-${counter}`
  }
  
  return newSlug
}

/**
 * Génère un slug unique pour un match
 * Format: equipe-domicile-vs-equipe-exterieur-j1 (j = journée)
 */
export function generateMatchSlug(
  homeTeamName: string,
  awayTeamName: string,
  matchday: number,
  existingSlugs: string[] = []
): string {
  const homeSlug = slugify(homeTeamName)
  const awaySlug = slugify(awayTeamName)
  const baseSlug = `${homeSlug}-vs-${awaySlug}-j${matchday}`
  
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug
  }
  
  // Si le slug existe déjà (match rejoué), ajouter un suffixe
  let counter = 2
  let newSlug = `${baseSlug}-${counter}`
  
  while (existingSlugs.includes(newSlug)) {
    counter++
    newSlug = `${baseSlug}-${counter}`
  }
  
  return newSlug
}

/**
 * Valide qu'un slug respecte le format attendu
 */
export function isValidSlug(slug: string): boolean {
  // Un slug valide contient uniquement des lettres minuscules, chiffres et tirets
  // Ne commence ni ne finit par un tiret
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
}
