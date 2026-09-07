import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { AuthLayout } from '@/components/auth/AuthLayout'

export function UpdatePasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword]       = useState('')
  const [confirmPassword, setConfirm] = useState('')
  const [error, setError]             = useState<string | null>(null)
  const [isLoading, setIsLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8)          { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="w-full animate-fade-in-up">

        <div className="mb-10">
          <h2 className="text-4xl xl:text-5xl font-black text-white tracking-tight mb-3 leading-tight">
            Nouveau mot de passe
          </h2>
          <p className="text-slate-300 text-lg xl:text-xl leading-relaxed font-medium">
            Choisissez un mot de passe sécurisé
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">
          {error && (
            <div className="flex items-start gap-3.5 bg-red-500/12 border border-red-500/30
                            text-red-300 text-base px-5 py-4 rounded-2xl animate-scale-in"
              role="alert" aria-live="polite">
              <span className="shrink-0 mt-0.5 text-xl">⚠️</span>
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          <div className="space-y-2.5">
            <label htmlFor="password" className="label">Nouveau mot de passe</label>
            <PasswordInput
              id="password" value={password} onChange={setPassword}
              placeholder="Minimum 8 caractères"
              autoComplete="new-password" required
              showStrength
            />
          </div>

          <div className="space-y-2.5">
            <label htmlFor="confirmPassword" className="label">Confirmer le mot de passe</label>
            <PasswordInput
              id="confirmPassword" value={confirmPassword} onChange={setConfirm}
              autoComplete="new-password" required
              showMatch={password}
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
            {isLoading
              ? <LoadingSpinner size="sm" />
              : <><span>Mettre à jour</span><ArrowRight size={20} strokeWidth={2.5} /></>
            }
          </button>
        </form>
      </div>
    </AuthLayout>
  )
}
