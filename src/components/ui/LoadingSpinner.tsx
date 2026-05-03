import { clsx } from 'clsx'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-surface-border border-t-primary-500',
        size === 'sm' && 'w-3.5 h-3.5',
        size === 'md' && 'w-6 h-6',
        size === 'lg' && 'w-10 h-10',
        className
      )}
    />
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-surface">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-slate-500 text-sm">Chargement...</p>
      </div>
    </div>
  )
}
