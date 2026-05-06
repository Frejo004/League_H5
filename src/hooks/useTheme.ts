import { useState, useEffect } from 'react'

export type Theme = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'

interface UseThemeReturn {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export function useTheme(): UseThemeReturn {
  // Récupérer le thème sauvegardé ou utiliser 'system' par défaut
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme')
    return (saved as Theme) || 'system'
  })

  // Détecter la préférence système
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'dark'
  })

  // Résoudre le thème actuel (si 'system', utiliser la préférence système)
  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme

  // Écouter les changements de préférence système
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light')
    }

    // Utiliser addEventListener pour la compatibilité
    mediaQuery.addEventListener('change', handleChange)
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  // Appliquer le thème au document
  useEffect(() => {
    const root = document.documentElement
    
    // Retirer les anciennes classes
    root.classList.remove('theme-dark', 'theme-light')
    
    // Ajouter la nouvelle classe
    root.classList.add(`theme-${resolvedTheme}`)
    
    // Mettre à jour l'attribut data-theme pour les sélecteurs CSS
    root.setAttribute('data-theme', resolvedTheme)
    
    // Sauvegarder dans localStorage
    localStorage.setItem('theme', theme)
  }, [theme, resolvedTheme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    setThemeState(current => {
      // Toggle entre dark et light (ignore system)
      if (current === 'system') {
        return systemTheme === 'dark' ? 'light' : 'dark'
      }
      return current === 'dark' ? 'light' : 'dark'
    })
  }

  return {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme
  }
}
