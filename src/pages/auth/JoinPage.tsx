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
    let token = searchParams.get('token')
    const inviteParam = searchParams.get('invite')

    if (inviteParam) {
      token = inviteParam
    }

    if (token) {
      sessionStorage.setItem('invite_token', token)
      // Remove token from URL to avoid leakage in history/referrer
      navigate(window.location.pathname, { replace: true })
    }
  }, [searchParams, navigate])

  // Get token from sessionStorage (if any)
  const token = sessionStorage.getItem('invite_token') ?? ''

  const [playerInfo, setPlayerInfo]   = useState<InvitePlayerInfo | null>(null)
  // Lazy initializer: si pas de token, on passe directement à 'invalid' sans useEffect
  const [tokenState, setTokenState]   = useState<'loading' | 'valid' | 'invalid'>(() => token ? 'loading' : 'invalid')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPassword, setConfirm] = useState('')
  const [error, setError]             = useState<string | null>(null)
  const [isLoading, setIsLoading]     = useState(false)
  const [success, setSuccess]         = useState(false)

  // Résoudre le token — s'exécute uniquement si le token existe (tokenState = 'loading')
  // Le token n'est purgé qu'après un claim effectif (voir handleSubmit) afin de
  // permettre à l'utilisateur de recharger la page sans perdre son invitation.
  useEffect(() => {
    if (!token) return
    resolveInviteToken(token).then(info => {
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
        // Succès : purger le token et rediriger vers la page de connexion
        // Le joueur devra se connecter manuellement pour que son profil soit chargé correctement
        sessionStorage.removeItem('invite_token')
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
        <div className="w-full text-center animate-scale-in">
          <div className="w-24 h-24 rounded-3xl bg-red-500/15 border border-red-500/30
                          flex items-center justify-center mx-auto mb-8">
            <span className="text-5xl">🔗</span>
          </div>
          <h2 className="text-4xl xl:text-5xl font-black text-white mb-4 leading-tight">Lien invalide</h2>
          <p className="text-slate-300 text-lg xl:text-xl mb-10 leading-relaxed font-medium">
            Ce lien d'invitation est invalide, expiré, ou a déjà été utilisé.
            Demandez un nouveau lien à votre admin ou capitaine.
          </p>
          <button onClick={() => navigate('/auth/login')} className="btn-secondary w-full">
            <span>Aller à la connexion</span>
          </button>
        </div>
      </AuthLayout>
    )
  }

  if (success) {
    return (
      <AuthLayout>
        <div className="w-full text-center animate-scale-in">
          <div className="w-24 h-24 rounded-3xl bg-green-500/15 border border-green-500/30
                          flex items-center justify-center mx-auto mb-8">
            <span className="text-5xl">✅</span>
          </div>
          <h2 className="text-4xl xl:text-5xl font-black text-white mb-4 leading-tight">Compte joueur créé !</h2>
          <p className="text-slate-300 text-lg xl:text-xl mb-10 leading-relaxed font-medium">
            Votre compte joueur a été créé avec succès.
            Connectez-vous maintenant pour accéder à votre ligue.
          </p>
          <button onClick={() => navigate('/auth/login')} className="btn-primary w-full">
            <span>Se connecter</span>
            <ArrowRight size={20} strokeWidth={2.5} />
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="w-full animate-fade-in-up">

        {/* Header */}
        <div className="mb-10">
          <h2 className="text-4xl xl:text-5xl font-black text-white tracking-tight mb-3 leading-tight">Créer votre compte joueur</h2>
          <p className="text-slate-300 text-lg xl:text-xl leading-relaxed font-medium">League H5 — Ligue interne</p>
        </div>

        {/* Player banner */}
        <div className="flex items-center gap-5 bg-primary-600/12 border border-primary-600/30
                        rounded-2xl px-5 py-5 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary-600/35 flex items-center justify-center
                          text-white text-2xl font-black shrink-0">
            {playerInfo!.first_name[0]}{playerInfo!.last_name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-black text-lg truncate">
              {playerInfo!.first_name} {playerInfo!.last_name}
            </p>
            <p className="text-base text-primary-300 font-bold mt-0.5">{playerInfo!.team_name}</p>
          </div>
          <span className="badge bg-primary-600/25 text-primary-300 border border-primary-600/40 shrink-0 text-base font-bold px-3.5 py-1.5">
            Joueur
          </span>
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

          {/* Nom — lecture seule */}
          <div className="space-y-2.5">
            <label className="label">Nom complet</label>
            <div className="input bg-surface-raised text-slate-300 cursor-not-allowed
                            flex items-center justify-between select-none font-medium"
                 style={{ height: 'auto', minHeight: '3.25rem' }}>
              <span className="font-bold">{playerInfo!.first_name} {playerInfo!.last_name}</span>
              <span className="text-sm text-slate-400 ml-4 shrink-0 font-bold">🔒 Défini par l'admin</span>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2.5">
            <label htmlFor="email" className="label">Adresse email</label>
            <div className="relative">
              <Mail size={20} strokeWidth={2} className="absolute left-[1.05rem] top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input id="email" type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                className="input input-icon-l" placeholder="vous@exemple.com"
                required autoComplete="email" />
            </div>
          </div>

          {/* Mot de passe */}
          <div className="space-y-2.5">
            <label htmlFor="password" className="label">Mot de passe</label>
            <PasswordInput
              id="password" value={password} onChange={setPassword}
              placeholder="Minimum 8 caractères"
              autoComplete="new-password" required
              showStrength
            />
          </div>

          {/* Confirmation */}
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
              ? <><LoadingSpinner size="sm" /><span>Création...</span></>
              : <><span>Créer mon compte</span><ArrowRight size={20} strokeWidth={2.5} /></>
            }
          </button>
        </form>

        <p className="text-center text-lg text-slate-300 mt-8 pt-6 border-t border-surface-border font-medium">
          Déjà un compte ?{' '}
          <button onClick={() => navigate('/auth/login')}
            className="text-primary-400 hover:text-primary-300 font-black transition-colors">
            Se connecter
          </button>
        </p>
      </div>
    </AuthLayout>
  )
}
