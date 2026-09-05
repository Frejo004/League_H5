import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { LoadingSpinner } from './LoadingSpinner'
import { clsx } from 'clsx'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean | string
  icon?: ReactNode
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-primary-600 text-white hover:bg-primary-500 active:scale-[0.98] shadow-lg shadow-primary-900/20',
      secondary: 'bg-surface-raised text-text-primary border border-surface-border hover:bg-surface-muted hover:border-text-muted',
      danger: 'bg-red-600 text-white hover:bg-red-500 active:scale-[0.98] shadow-lg shadow-red-900/20',
      ghost: 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-raised',
    }

    const sizes: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-xs rounded-lg',
      md: 'px-4 py-2.5 text-sm rounded-xl',
      lg: 'px-6 py-3.5 text-base rounded-2xl',
    }

    const isLoading = loading !== undefined && loading !== false
    const loadingText = typeof loading === 'string' ? loading : null

    return (
      <button
        ref={ref}
        className={clsx(base, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? <LoadingSpinner size="sm" /> : icon}
        {loadingText || children}
      </button>
    )
  }
)

Button.displayName = 'Button'
