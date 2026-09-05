/**
 * Télémétrie d'erreurs — intégration Sentry optionnelle.
 *
 * L'app fonctionne sans Sentry : si aucun DSN n'est fourni via
 * `VITE_SENTRY_DSN`, les appels `captureException` / `captureMessage`
 * sont des no-ops. Aucune dépendance npm n'est requise : on parle
 * directement à l'API HTTP `/store/` de Sentry.
 *
 * Pour activer Sentry en production :
 *   1. Créer un projet sur https://sentry.io/
 *   2. Ajouter `VITE_SENTRY_DSN=https://...@sentry.io/...` à .env
 *   3. Optionnel : `VITE_SENTRY_ENV=production`
 *
 * Documentation : https://docs.sentry.io/api/store/
 */

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined
const SENTRY_ENV = (import.meta.env.VITE_SENTRY_ENV as string | undefined) ?? import.meta.env.MODE
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '0.0.0'
const ENABLED = Boolean(SENTRY_DSN)

interface ParsedDsn {
  endpoint: string
  publicKey: string
}

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const u = new URL(dsn)
    const publicKey = u.username
    const pathParts = u.pathname.split('/').filter(Boolean)
    const projectId = pathParts[pathParts.length - 1]
    if (!publicKey || !projectId) return null
    const endpoint = `${u.protocol}//${u.host}/api/${projectId}/store/?sentry_version=7&sentry_key=${publicKey}`
    return { endpoint, publicKey }
  } catch {
    return null
  }
}

const parsed = ENABLED && SENTRY_DSN ? parseDsn(SENTRY_DSN) : null

/**
 * Envoie un événement à Sentry (fire-and-forget). Silencieux en dev
 * ou si Sentry n'est pas configuré.
 */
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!parsed) return
  const err = error instanceof Error ? error : new Error(String(error))
  void sendEvent({
    level: 'error',
    message: err.message,
    stack: err.stack,
    ...context,
  })
}

export function captureMessage(message: string, context?: Record<string, unknown>): void {
  if (!parsed) return
  void sendEvent({ level: 'info', message, ...context })
}

async function sendEvent(fields: Record<string, unknown>) {
  if (!parsed) return
  const event = {
    event_id: cryptoRandomHex(32),
    timestamp: Date.now() / 1000,
    platform: 'javascript',
    environment: SENTRY_ENV,
    release: APP_VERSION,
    tags: { app: 'league-h5' },
    ...fields,
  }
  try {
    await fetch(parsed.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    })
  } catch (err) {
    console.warn('[sentry] échec de l\'envoi', err)
  }
}

function cryptoRandomHex(bytes: number): string {
  const arr = new Uint8Array(bytes / 2)
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    crypto.getRandomValues(arr)
  } else {
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('')
}

export const telemetry = {
  enabled: ENABLED,
  captureException,
  captureMessage,
}
