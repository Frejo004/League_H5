import type { PlayerPosition } from '@/types/database'

/**
 * Libellés des postes de joueurs
 */
export const POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: 'GB',
  defender:   'DEF',
  midfielder: 'MIL',
  forward:    'ATT',
}

/**
 * Couleurs associées aux postes
 */
export const POSITION_COLORS: Record<PlayerPosition, string> = {
  goalkeeper: 'text-yellow-400 bg-yellow-400/10',
  defender:   'text-blue-400 bg-blue-400/10',
  midfielder: 'text-green-400 bg-green-400/10',
  forward:    'text-orange-400 bg-orange-400/10',
}
