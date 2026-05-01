import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AuthLayout } from '@/components/auth/AuthLayout'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // navigate is handled by onAuthStateChange in AuthContext
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm animate-fade-in-up">

        {/* Header */}
        <div className="mb-8">
          {/* Mobile logo only */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-primary-500 rounded-xl blur-md opacity-60" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-700 rounded-xl flex items-center justify-center">
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
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25
                            text-red-400 text-sm px-4 py-3 rounded-xl animate-scale-in">
              <span className="mt-0.5 flex-shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="label">Adresse email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input pl-10"
                placeholder="vous@exemple.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="label mb-0">Mot de passe</label>
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
                className="input pl-10"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full mt-2 py-3 text-base"
          >
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                Se connecter
                <ArrowRight size={16} className="ml-1" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-surface-border/60" />
          <span className="text-xs text-slate-600 font-medium">ou</span>
          <div className="flex-1 h-px bg-surface-border/60" />
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
