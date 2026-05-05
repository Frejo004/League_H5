import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { AuthLayout } from '@/components/auth/AuthLayout'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  function getErrorMessage(err: unknown) {
    const msg = (err instanceof Error ? err.message : '').toLowerCase()
    if (msg.includes('invalid login credentials')) return 'Email ou mot de passe incorrect'
    if (msg.includes('email not confirmed'))        return 'Veuillez confirmer votre email'
    return 'Erreur de connexion. Veuillez réessayer.'
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (!email.includes('@')) { setError('Veuillez entrer un email valide'); return }
    if (password.length < 6)  { setError('Le mot de passe doit contenir au moins 6 caractères'); return }
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      
      // Redirection immédiate - le ProtectedRoute attendra que le profil soit chargé
      // grâce à la correction dans AuthContext qui évite le double chargement
      navigate('/', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm animate-fade-in-up">

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white tracking-tight">Bon retour 👋</h2>
          <p className="text-slate-400 mt-1.5 text-sm">Connectez-vous pour accéder à votre ligue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25
                            text-red-400 text-sm px-3.5 py-3 rounded-lg animate-scale-in"
              role="alert" aria-live="polite">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="label">Adresse email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                id="email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                className="input input-icon-l"
                placeholder="vous@exemple.com"
                required autoComplete="email" disabled={isLoading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="label">Mot de passe</label>
              <Link to="/auth/reset-password"
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                Oublié ?
              </Link>
            </div>
            <PasswordInput
              id="password" value={password} onChange={setPassword}
              autoComplete="current-password" required disabled={isLoading}
            />
          </div>

          <button type="submit" disabled={isLoading}
            className="btn-primary w-full py-2.5 text-sm mt-1">
            {isLoading
              ? <LoadingSpinner size="sm" />
              : <><span>Se connecter</span><ArrowRight size={15} /></>
            }
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-surface-border" />
          <span className="text-xs text-slate-600 font-medium">ou</span>
          <div className="flex-1 h-px bg-surface-border" />
        </div>

        <p className="text-center text-sm text-slate-400">
          Pas encore de compte ?{' '}
          <Link to="/auth/signup" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
            Créer un compte
          </Link>
        </p>
        <p className="text-center text-xs text-slate-600 mt-3">
          Accès spectateur ? Inscrivez-vous et attendez l'approbation de l'admin.
        </p>
      </div>
    </AuthLayout>
  )
}
