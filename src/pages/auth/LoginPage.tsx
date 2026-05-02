import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AuthLayout } from '@/components/auth/AuthLayout'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const getErrorMessage = (error: any) => {
    const message = error.message?.toLowerCase() || ''
    if (message.includes('invalid login credentials')) {
      return 'Email ou mot de passe incorrect'
    }
    if (message.includes('email not confirmed')) {
      return 'Veuillez confirmer votre email'
    }
    return 'Erreur de connexion. Veuillez réessayer.'
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.includes('@')) {
      setError('Veuillez entrer un email valide')
      return
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // ✅ Pas de navigate() ici — onAuthStateChange dans AuthContext gère la redirection
      // Le isLoading reste à true jusqu'à la redirection
    } catch (err: any) {
      setError(getErrorMessage(err))
      setIsLoading(false) // ✅ seulement en cas d'erreur
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm">
        {/* Header */}
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

          <h2 className="text-3xl font-black text-white tracking-tight">Bon retour 👋</h2>
          <p className="text-slate-400 mt-2">Connectez-vous pour accéder à votre ligue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 text-red-400 text-sm px-4 py-3 rounded-xl"
              role="alert"
              aria-live="polite"
            >
              <span className="mt-0.5 flex-shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-300">
              Adresse email
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 pl-10 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="vous@exemple.com"
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-slate-300">
                Mot de passe
              </label>
              <Link
                to="/auth/reset-password"
                className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                Oublié ?
              </Link>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 pl-10 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            aria-disabled={isLoading}
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                Se connecter
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-slate-700/60" />
          <span className="text-xs text-slate-600 font-medium">ou</span>
          <div className="flex-1 h-px bg-slate-700/60" />
        </div>

        {/* Sign up link */}
        <p className="text-center text-sm text-slate-400">
          Pas encore de compte ?{' '}
          <Link to="/auth/signup" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
            Créer un compte
          </Link>
        </p>

        <p className="text-center text-xs text-slate-600 mt-4">
          Accès spectateur ? Inscrivez-vous et attendez l'approbation de l'admin.
        </p>
      </div>
    </AuthLayout>
  )
}