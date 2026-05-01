import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
      navigate('/')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-3xl">⚽</span>
          </div>
          <h1 className="text-2xl font-bold text-white">League H5</h1>
          <p className="text-slate-300 mt-1">Connectez-vous à votre compte</p>
        </div>

        {/* Form */}
        <div className="card bg-surface-card/90 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="vous@entreprise.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">Mot de passe</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center justify-end">
              <Link
                to="/auth/reset-password"
                className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : null}
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-surface-border text-center">
            <p className="text-sm text-slate-400">
              Pas encore de compte ?{' '}
              <Link
                to="/auth/signup"
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                S'inscrire
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Accès spectateur ? Inscrivez-vous et attendez l'approbation de l'admin.
        </p>
      </div>
    </AuthLayout>
  )
}
