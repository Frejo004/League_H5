import { useState, useEffect, type FormEvent } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { resolveInviteToken, claimInvite } from '@/hooks/usePlayerInvites'
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner'
import type { InvitePlayerInfo } from '@/hooks/usePlayerInvites'

export function JoinPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''

  const [playerInfo, setPlayerInfo] = useState<InvitePlayerInfo | null>(null)
  const [tokenState, setTokenState] = useState<'loading' | 'valid' | 'invalid'>('loading')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Resolve token on mount
  useEffect(() => {
    if (!token) { setTokenState('invalid'); return }

    resolveInviteToken(token).then(info => {
      if (!info || !info.is_valid) {
        setTokenState('invalid')
      } else {
        setPlayerInfo(info)
        setTokenState('valid')
      }
    })
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setIsLoading(true)
    try {
      // Sign up — name comes from player record, not user input
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${playerInfo!.first_name} ${playerInfo!.last_name}`,
          },
        },
      })
      if (signUpError) throw signUpError

      const userId = data.user?.id
      if (!userId) throw new Error("Erreur lors de la création du compte.")

      // Link user to player and set role
      await claimInvite(token, userId)

      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription")
    } finally {
      setIsLoading(false)
    }
  }

  if (tokenState === 'loading') return <PageLoader />

  if (tokenState === 'invalid') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-2xl mb-4">
            <span className="text-3xl">🔗</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Lien invalide</h2>
          <p className="text-slate-400 mb-6">
            Ce lien d'invitation est invalide, expiré, ou a déjà été utilisé.
            Demandez un nouveau lien à votre admin ou capitaine.
          </p>
          <button onClick={() => navigate('/auth/login')} className="btn-secondary">
            Aller à la connexion
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600/20 border border-primary-600/30 rounded-2xl mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Compte créé !</h2>
          <p className="text-slate-400 mb-6">
            Vérifiez votre email pour confirmer votre compte, puis connectez-vous.
          </p>
          <button onClick={() => navigate('/auth/login')} className="btn-primary">
            Aller à la connexion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-3xl">⚽</span>
          </div>
          <h1 className="text-2xl font-bold text-white">League H5</h1>
          <p className="text-slate-400 mt-1">Créer votre compte joueur</p>
        </div>

        {/* Player info banner */}
        <div className="bg-primary-600/10 border border-primary-600/30 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-600/30 flex items-center justify-center text-white font-bold flex-shrink-0">
            {playerInfo!.first_name[0]}{playerInfo!.last_name[0]}
          </div>
          <div>
            <p className="text-white font-semibold">
              {playerInfo!.first_name} {playerInfo!.last_name}
            </p>
            <p className="text-sm text-primary-400">{playerInfo!.team_name}</p>
          </div>
          <span className="ml-auto badge bg-primary-600/20 text-primary-400 border border-primary-600/30 text-xs">
            Joueur
          </span>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Name — read-only, comes from player record */}
            <div>
              <label className="label">Nom complet</label>
              <div className="input bg-surface-border/30 text-slate-400 cursor-not-allowed select-none flex items-center justify-between">
                <span>{playerInfo!.first_name} {playerInfo!.last_name}</span>
                <span className="text-xs text-slate-500 ml-2">🔒 Défini par l'admin</span>
              </div>
            </div>

            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="vous@exemple.com"
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
                placeholder="Minimum 8 caractères"
                required
                autoComplete="new-password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">Confirmer le mot de passe</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : null}
              {isLoading ? 'Création...' : 'Créer mon compte'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-surface-border text-center">
            <p className="text-sm text-slate-400">
              Déjà un compte ?{' '}
              <button
                onClick={() => navigate('/auth/login')}
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Se connecter
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
