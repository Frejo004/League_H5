import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import clsx from 'clsx'

export interface PasswordInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
  disabled?: boolean
  className?: string
  showStrength?: boolean
  showMatch?: string
}

function getStrength(pwd: string) {
  let s = 0
  if (pwd.length >= 8)  s++
  if (/[A-Z]/.test(pwd)) s++
  if (/[0-9]/.test(pwd)) s++
  if (/[^A-Za-z0-9]/.test(pwd)) s++
  return s
}

const STRENGTH_COLOR: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-yellow-500',
  4: 'bg-green-500',
}
const STRENGTH_TEXT: Record<number, string> = {
  1: 'text-red-400',
  2: 'text-orange-400',
  3: 'text-yellow-400',
  4: 'text-green-400',
}
const STRENGTH_LABEL: Record<number, string> = {
  1: 'Faible',
  2: 'Moyen',
  3: 'Bon',
  4: 'Excellent',
}

export function PasswordInput({
  id, value, onChange, placeholder, autoComplete, required, disabled, className, showStrength, showMatch,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const strength = getStrength(value)
  const isMatch = showMatch !== undefined && value.length > 0 && value === showMatch

  return (
    <div className="space-y-3">
      <div className="relative">
        {/* Icône cadenas GAUCHE */}
        <Lock
          size={17}
          strokeWidth={2}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />

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

        {/* Bouton toggle visibilité */}
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-white/5"
          tabIndex={-1}
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {visible ? <EyeOff size={17} strokeWidth={2} /> : <Eye size={17} strokeWidth={2} />}
        </button>
      </div>

      {/* Strength bar */}
      {showStrength && value.length > 0 && (
        <div className="space-y-2.5 animate-fade-in">
          <div className="flex gap-2.5">
            {[1,2,3,4].map(i => (
              <div
                key={i}
                className={clsx(
                  'h-2.5 flex-1 rounded-full transition-all duration-300',
                  i <= strength ? STRENGTH_COLOR[strength] : 'bg-surface-border'
                )}
              />
            ))}
          </div>
          <p className={clsx('text-lg font-black', STRENGTH_TEXT[strength])}>
            {STRENGTH_LABEL[strength]}
          </p>
        </div>
      )}
    </div>
  )
}
