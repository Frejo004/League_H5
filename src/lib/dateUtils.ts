/**
 * Helpers de formatage de dates avec fuseau horaire explicite.
 *
 * Le projet utilise le fuseau `Africa/Porto-Novo` (Bénin, UTC+1).
 * Au lieu de monkey-patcher globalement `Intl.DateTimeFormat` et
 * `Date.prototype` (ce qui crée des conflits avec des bibliothèques
 * tierces), ces helpers centralisent le fuseau.
 *
 * Migration : remplacer les appels directs à
 *   `date.toLocaleString()` / `toLocaleDateString()` / `toLocaleTimeString()`
 * par les helpers correspondants.
 */

export const APP_TIMEZONE = 'Africa/Porto-Novo'

const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = { timeZone: APP_TIMEZONE }

/** Formate une date avec le fuseau de l'app. */
export function formatDateTime(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleString('fr-FR', { ...DEFAULT_OPTIONS, ...options })
}

/** Formate uniquement la partie date (jj/mm/aaaa par défaut). */
export function formatDate(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleDateString('fr-FR', {
    ...DEFAULT_OPTIONS,
    ...options,
  })
}

/** Formate uniquement l'heure (HH:mm par défaut). */
export function formatTime(
  value: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleTimeString('fr-FR', {
    ...DEFAULT_OPTIONS,
    ...options,
  })
}

/** Renvoie une "Date" représentant le début du jour dans le fuseau de l'app. */
export function startOfDayInAppTZ(value: Date | string | number): Date {
  const date = value instanceof Date ? value : new Date(value)
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = fmt.formatToParts(date)
  const y = parts.find(p => p.type === 'year')?.value ?? '1970'
  const m = parts.find(p => p.type === 'month')?.value ?? '01'
  const d = parts.find(p => p.type === 'day')?.value ?? '01'
  return new Date(`${y}-${m}-${d}T00:00:00`)
}
