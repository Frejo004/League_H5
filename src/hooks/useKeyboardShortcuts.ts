/**
 * useKeyboardShortcuts — Raccourcis clavier globaux
 *
 * Raccourcis disponibles :
 *   Cmd/Ctrl + K  → Recherche globale (géré dans GlobalSearch)
 *   G puis H       → Dashboard (/)
 *   G puis M       → Matchs (/matches)
 *   G puis C       → Classement (/standings)
 *   G puis S       → Stats (/stats)
 *   G puis T       → Équipes (/teams)
 *   G puis P       → Joueurs (/players)
 *   G puis X       → Messages (/chat)
 *   ?              → Afficher l'aide des raccourcis
 */
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const GOTO_MAP: Record<string, string> = {
  h: '/',
  m: '/matches',
  c: '/standings',
  s: '/stats',
  t: '/teams',
  p: '/players',
  x: '/chat',
  a: '/admin',
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const [showHelp, setShowHelp] = useState(false)
  const [gPressed, setGPressed] = useState(false)

  const handleKey = useCallback((e: KeyboardEvent) => {
    // Ignorer si focus dans un input/textarea/select
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase()
    if (['input', 'textarea', 'select'].includes(tag)) return
    if ((e.target as HTMLElement)?.isContentEditable) return

    // ? → aide
    if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault()
      setShowHelp(v => !v)
      return
    }

    // Escape → fermer l'aide
    if (e.key === 'Escape') {
      setShowHelp(false)
      setGPressed(false)
      return
    }

    // G → mode navigation
    if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault()
      setGPressed(true)
      // Reset après 1.5s si pas de 2ème touche
      setTimeout(() => setGPressed(false), 1500)
      return
    }

    // G + lettre → navigation
    if (gPressed && GOTO_MAP[e.key]) {
      e.preventDefault()
      setGPressed(false)
      navigate(GOTO_MAP[e.key])
      return
    }
  }, [navigate, gPressed])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  return { showHelp, setShowHelp, gPressed }
}

export const SHORTCUT_HELP = [
  { keys: ['⌘', 'K'], description: 'Recherche globale' },
  { keys: ['G', 'H'], description: 'Aller au Dashboard' },
  { keys: ['G', 'M'], description: 'Aller aux Matchs' },
  { keys: ['G', 'C'], description: 'Aller au Classement' },
  { keys: ['G', 'S'], description: 'Aller aux Stats' },
  { keys: ['G', 'T'], description: 'Aller aux Équipes' },
  { keys: ['G', 'P'], description: 'Aller aux Joueurs' },
  { keys: ['G', 'X'], description: 'Aller aux Messages' },
  { keys: ['?'], description: 'Afficher cette aide' },
  { keys: ['Esc'], description: 'Fermer / Annuler' },
]
