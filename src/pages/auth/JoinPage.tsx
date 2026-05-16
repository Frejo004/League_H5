import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Mail, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { resolveInviteToken, claimInvite } from '@/hooks/usePlayerInvites'
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { AuthLayout } from '@/components/auth/AuthLayout'
import type { InvitePlayerInfo } from '@/hooks/usePlayerInvites'

export function JoinPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Handle token from URL: store in sessionStorage and clean URL
  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      sessionStorage.setItem('invite_token', token)
      // Remove token from URL to avoid leakage in history/referrer
      navigate(window.location.pathname, { replace: true })
    }
  }, [searchParams, navigate])

  // Get token from sessionStorage (if any)
  const token = sessionStorage.getItem('invite_token') ?? ''

  const [playerInfo, setPlayerInfo]   = useState<InvitePlayerInfo | null>(null)
  const [tokenState, setTokenState]   = useState<'loading' | 'valid' | 'invalid'>('loading')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPassword, setConfirm] = useState('')
  const [error, setError]             = useState<string | null>(null)
  const [isLoading, setIsLoading]     = useState(false)
  const [success, setSuccess]         = useState(false)

  // Resolve token when it changes
  useEffect(() => {
    if (!token) { 
      setTokenState('invalid'); 
      return 
    }
    resolveInviteToken(token).then(info => {
      // Clear token after use to prevent reuse
      sessionStorage.removeItem('invite_token')
      if (!info || !info.is_valid) setTokenState('invalid')
      else { setPlayerInfo(info); setTokenState('valid') }
    })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8)          { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    setIsLoading(true)
    try {
      // Étape 1 : créer le compte Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: `${playerInfo!.first_name} ${playerInfo!.last_name}` } },
      })
      if (signUpError) throw signUpError

      const userId = data.user?.id
      if (!userId) {
        // Supabase a créé le compte mais retourne null si confirmation email activée.
        // Dans ce cas, le claim se fera via le lien de confirmation (flow email).
        // On affiche le succès et on indique de vérifier l'email.
        setSuccess(true)
        return
      }

      // Étape 2 : lier le compte au joueur via le token d'invitation
      // Cette étape est critique — si elle échoue, le compte existe mais
      // le joueur n'est pas lié. On distingue les deux types d'erreur.
      try {
        await claimInvite(token, userId)
        // Succès : rediriger vers la page de connexion
        // Le joueur devra se connecter manuellement pour que son profil soit chargé correctement
        setSuccess(true)
      } catch (claimErr: unknown) {
        // Le compte a été créé mais le lien joueur a échoué.
        // L'utilisateur peut se connecter, mais son profil sera en mode spectateur
        // jusqu'à ce qu'un admin corrige manuellement.
        const msg = claimErr instanceof Error ? claimErr.message : 'Erreur inconnue'
        setError(
          `Compte créé, mais le lien avec votre profil joueur a échoué (${msg}). ` +
          `Connectez-vous et contactez votre administrateur en indiquant votre email.`
        )
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription")
    } finally {
      setIsLoading(false)
    }
  }

  if (tokenState === 'loading') return <PageLoader />

  if (tokenState === 'invalid') {
    return (
      <AuthLayout>
        <div className="w-full max-w-sm text-center animate-scale-in">
          <div className="w-14 h-14 rounded-xl bg-red-500/15 border border-red-500/25
                          flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔗</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Lien invalide</h2>
          <p className="text-slate-400 text-sm mb-5 leading-relaxed">
            Ce lien d'invitation est invalide, expiré, ou a déjà été utilisé.
            Demandez un nouveau lien à votre admin ou capitaine.
          </p>
          <button onClick={() => navigate('/auth/login')} className="btn-secondary w-full">
            Aller à la connexion
          </button>
        </div>
      </AuthLayout>
    )
  }

  if (success) {
    return (
      <AuthLayout>
        <div className="w-full max-w-sm text-center animate-scale-in">
          <div className="w-14 h-14 rounded-xl bg-green-500/15 border border-green-500/25
                          flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✅</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Compte joueur créé !</h2>
          <p className="text-slate-400 text-sm mb-5">
            Votre compte joueur a été créé avec succès.
            Connectez-vous maintenant pour accéder à votre ligue.
          </p>
          <button onClick={() => navigate('/auth/login')} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
            Se connecter <ArrowRight size={15} />
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm animate-fade-in-up">

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white tracking-tight">Créer votre compte joueur</h2>
          <p className="text-slate-400 mt-1.5 text-sm">League H5 — Ligue interne</p>
        </div>

        {/* Player banner */}
        <div className="flex items-center gap-3 bg-primary-600/10 border border-primary-600/25
                        rounded-lg px-3.5 py-3 mb-5">
          <div className="w-9 h-9 rounded-full bg-primary-600/30 flex items-center justify-center
                          text-white text-sm font-bold shrink-0">
            {playerInfo!.first_name[0]}{playerInfo!.last_name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm truncate">
              {playerInfo!.first_name} {playerInfo!.last_name}
            </p>
            <p className="text-xs text-primary-400">{playerInfo!.team_name}</p>
          </div>
          <span className="badge bg-primary-600/20 text-primary-400 border border-primary-600/30 shrink-0">
            Joueur
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25
                            text-red-400 text-sm px-3.5 py-3 rounded-lg animate-scale-in">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Nom — lecture seule */}
          <div className="space-y-1.5">
            <label className="label">Nom complet</label>
            <div className="input bg-surface-raised text-slate-400 cursor-not-allowed
                            flex items-center justify-between select-none">
              <span>{playerInfo!.first_name} {playerInfo!.last_name}</span>
              <span className="text-xs text-slate-600 ml-2 shrink-0">🔒 Défini par l'admin</span>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="label">Email</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input id="email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                className="input input-icon-l" placeholder="vous@exemple.com"
                required autoComplete="email" />
            </div>
          </div>

          {/* Mot de passe */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="label">Mot de passe</label>
            <PasswordInput
              id="password" value={password} onChange={setPassword}
              placeholder="Minimum 8 caractères"
              autoComplete="new-password" required
              showStrength
            />
          </div>

          {/* Confirmation */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="label">Confirmer le mot de passe</label>
            <PasswordInput
              id="confirmPassword" value={confirmPassword} onChange={setConfirm}
              autoComplete="new-password" required
              showMatch={password}
            />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5 text-sm mt-1">
            {isLoading
              ? <><LoadingSpinner size="sm" /><span>Création...</span></>
              : <><span>Créer mon compte</span><ArrowRight size={15} /></>
            }
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-5">
          Déjà un compte ?{' '}
          <button onClick={() => navigate('/auth/login')}
            className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
            Se connecter
          </button>
        </p>
      </div>
    </AuthLayout>
  )
}
