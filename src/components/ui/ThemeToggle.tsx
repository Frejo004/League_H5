import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className={`theme-toggle ${className}`}
      aria-label={`Passer en mode ${resolvedTheme === 'dark' ? 'clair' : 'sombre'}`}
      title={`Passer en mode ${resolvedTheme === 'dark' ? 'clair' : 'sombre'}`}
    >
      <div className="theme-toggle-icon">
        {resolvedTheme === 'dark' ? (
          <Sun size={18} />
        ) : (
          <Moon size={18} />
        )}
      </div>
      
      {showLabel && (
        <span className="theme-toggle-label">
          {resolvedTheme === 'dark' ? 'Clair' : 'Sombre'}
        </span>
      )}
    </button>
  )
}
