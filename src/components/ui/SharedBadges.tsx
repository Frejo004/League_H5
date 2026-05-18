import { clsx } from 'clsx'
import type { PlayerPosition } from '@/types/database'

/**
 * Libellés des postes de joueurs
 */
export const POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: 'Gardien',
  defender:   'Défenseur',
  midfielder: 'Milieu',
  forward:    'Attaquant',
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

/**
 * Badge de forme (W/D/L) utilisé dans les tableaux de classement
 */
export function FormBadge({ result }: { result: 'W' | 'D' | 'L' }) {
  return (
    <span className={clsx(
      'inline-flex items-center justify-center w-5 h-5 rounded-md text-[9px] font-black shrink-0',
      result === 'W' && 'bg-win text-win-text shadow-[0_1px_3px_rgba(0,0,0,0.1)]',
      result === 'D' && 'bg-draw text-draw-text shadow-[0_1px_3px_rgba(0,0,0,0.1)]',
      result === 'L' && 'bg-loss text-loss-text shadow-[0_1px_3px_rgba(0,0,0,0.1)]',
    )}>
      {result === 'W' ? 'V' : result === 'L' ? 'D' : 'N'}
    </span>
  )
}

/**
 * Badge de résultat utilisé dans les listes de matchs et profils
 */
export function ResultBadge({ result, variant = 'solid' }: { 
  result: 'W' | 'D' | 'L' | null,
  variant?: 'solid' | 'ghost'
}) {
  if (!result) return (
    <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shrink-0 bg-surface-raised text-slate-500">
      ·
    </div>
  )

  if (variant === 'ghost') {
    return (
      <div className={clsx(
        'w-6 h-6 rounded flex items-center justify-center text-[10px] font-black shrink-0',
        result === 'W' && 'bg-win/20 text-win',
        result === 'D' && 'bg-draw/20 text-draw',
        result === 'L' && 'bg-loss/20 text-loss',
      )}>
        {result === 'W' ? 'V' : result === 'L' ? 'D' : 'N'}
      </div>
    )
  }

  return (
    <span className={clsx(
      'inline-flex items-center justify-center w-5 h-5 rounded text-[9px] font-bold shrink-0',
      result === 'W' && 'bg-win text-win-text',
      result === 'D' && 'bg-draw text-draw-text',
      result === 'L' && 'bg-loss text-loss-text',
    )}>
      {result === 'W' ? 'V' : result === 'L' ? 'D' : 'N'}
    </span>
  )
}
