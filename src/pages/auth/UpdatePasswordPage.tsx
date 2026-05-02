import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, ArrowRight, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AuthLayout } from '@/components/auth/AuthLayout'

export function UpdatePasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Password strength
  const strength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : password.length < 12 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 4
    : 3

  const strengthLabel = ['', 'Faible', 'Moyen', 'Fort', 'Très fort']
  const strengthColor = ['', 'bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-primary-500']

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="mb-8">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-primary-500 rounded-xl blur-md opacity-60" />
              <div className="relative w-10 h-10 bg-linear-to-br from-primary-400 to-primary-700 rounded-xl flex items-center justify-center">
                <span className="text-xl">⚽</span>
              </div>
            </div>
            <span className="text-white font-bold text-lg">League H5</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">Nouveau mot de passe</h2>
          <p className="text-slate-400 mt-2">Choisissez un mot de passe sécurisé</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 text-red-400 text-sm px-4 py-3 rounded-xl">
              <span className="mt-0.5">⚠️</span><span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="password" className="label">Nouveau mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input pl-10" placeholder="Minimum 8 caractères" required autoComplete="new-password" />
            </div>
            {/* Strength bar */}
            {password.length > 0 && (
              <div className="space-y-1 animate-fade-in">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor[strength] : 'bg-surface-border'}`} />
                  ))}
                </div>
                <p className={`text-xs font-medium ${strength <= 1 ? 'text-red-400' : strength === 2 ? 'text-orange-400' : strength === 3 ? 'text-yellow-400' : 'text-primary-400'}`}>
                  {strengthLabel[strength]}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="label">Confirmer</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="input pl-10" placeholder="••••••••" required autoComplete="new-password" />
              {confirmPassword && password === confirmPassword && (
                <Check size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-primary-400" />
              )}
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-base">
            {isLoading ? <LoadingSpinner size="sm" /> : <><span>Mettre à jour</span><ArrowRight size={16} /></>}
          </button>
        </form>
      </div>
    </AuthLayout>
  )
}
