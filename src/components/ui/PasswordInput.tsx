import { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import { clsx } from 'clsx'

interface PasswordInputProps {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
  disabled?: boolean
  showStrength?: boolean
  showMatch?: string   // valeur à comparer pour afficher le ✓
  className?: string
}

function getStrength(pwd: string) {
  if (pwd.length === 0) return 0
  if (pwd.length < 8)   return 1
  if (pwd.length < 12)  return 2
  if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) return 4
  return 3
}

const STRENGTH_LABEL = ['', 'Faible', 'Moyen', 'Fort', 'Très fort']
const STRENGTH_COLOR = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500']
const STRENGTH_TEXT  = ['', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400']

export function PasswordInput({
  id, value, onChange, placeholder = '••••••••',
  autoComplete = 'current-password', required, disabled,
  showStrength, showMatch, className,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const strength = getStrength(value)
  const isMatch = showMatch !== undefined && value.length > 0 && value === showMatch

  return (
    <div className="space-y-1.5">
      <div className="relative">
        {/* Lock icon left */}
        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />

        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          className={clsx(
            'input input-icon-lr',
            isMatch && 'input-success',
            className
          )}
        />

        {/* Toggle visibility button */}
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500
                     hover:text-slate-300 transition-colors p-0.5"
          tabIndex={-1}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>

      {/* Strength bar */}
      {showStrength && value.length > 0 && (
        <div className="space-y-1 animate-fade-in">
          <div className="flex gap-1">
            {[1,2,3,4].map(i => (
              <div
                key={i}
                className={clsx(
                  'h-1 flex-1 rounded-full transition-all duration-300',
                  i <= strength ? STRENGTH_COLOR[strength] : 'bg-surface-border'
                )}
              />
            ))}
          </div>
          <p className={clsx('text-xs font-medium', STRENGTH_TEXT[strength])}>
            {STRENGTH_LABEL[strength]}
          </p>
        </div>
      )}
    </div>
  )
}
