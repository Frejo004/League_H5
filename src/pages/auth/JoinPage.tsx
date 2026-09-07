import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Mail, ArrowRight, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { resolveInviteToken, claimInvite } from '@/hooks/usePlayerInvites'
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { AuthLayout } from '@/components/auth/AuthLayout'
import type { InvitePlayerInfo } from '@/hooks/usePlayerInvites'

const iconStyle = {
  position: 'absolute' as const,
  left: '0.75rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#475569',
  pointerEvents: 'none' as const,
  zIndex: 1,
}

export function JoinPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    let token = searchParams.get('token')
    const inviteParam = searchParams.get('invite')
    if (inviteParam) token = inviteParam
    if (token) {
      sessionStorage.setItem('invite_token', token)
      navigate(window.location.pathname, { replace: true })
    }
  }, [searchParams, navigate])

  const token = sessionStorage.getItem('invite_token') ?? ''

  const [playerInfo, setPlayerInfo]   = useState<InvitePlayerInfo | null>(null)
  const [tokenState, setTokenState]   = useState<'loading' | 'valid' | 'invalid'>(() => token ? 'loading' : 'invalid')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPassword, setConfirm] = useState('')
  const [error, setError]             = useState<string | null>(null)
  const [isLoading, setIsLoading]     = useState(false)
  const [success, setSuccess]         = useState(false)

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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: `${playerInfo!.first_name} ${playerInfo!.last_name}` } },
      })
      if (signUpError) throw signUpError
      const userId = data.user?.id
      if (!userId) { setSuccess(true); return }
      try {
        await claimInvite(token, userId)
        sessionStorage.removeItem('invite_token')
        setSuccess(true)
      } catch (claimErr: unknown) {
        const msg = claimErr instanceof Error ? claimErr.message : 'Erreur inconnue'
        setError(`Compte créé, mais le lien avec votre profil joueur a échoué (${msg}). Connectez-vous et contactez votre administrateur.`)
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
        <div style={{ width: '100%', textAlign: 'center' }} className="animate-scale-in">
          <div style={{ width: '4rem', height: '4rem', borderRadius: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.75rem' }}>🔗</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc', marginBottom: '0.75rem' }}>Lien invalide</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Ce lien d'invitation est invalide, expiré, ou a déjà été utilisé. Demandez un nouveau lien à votre admin ou capitaine.
          </p>
          <button onClick={() => navigate('/auth/login')} className="btn-secondary" style={{ width: '100%' }}>
            Aller à la connexion
          </button>
        </div>
      </AuthLayout>
    )
  }

  if (success) {
    return (
      <AuthLayout>
        <div style={{ width: '100%', textAlign: 'center' }} className="animate-scale-in">
          <div style={{ width: '4rem', height: '4rem', borderRadius: '1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.75rem' }}>✅</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc', marginBottom: '0.75rem' }}>Compte joueur créé !</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Votre compte joueur a été créé avec succès. Connectez-vous maintenant pour accéder à votre ligue.
          </p>
          <button onClick={() => navigate('/auth/login')} className="btn-primary" style={{ width: '100%' }}>
            <span>Se connecter</span>
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="animate-fade-in-up" style={{ width: '100%' }}>

        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '0.4rem' }}>
            Créer votre compte joueur
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>League H5 — Ligue interne</p>
        </div>

        {/* Bannière joueur */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '0.75rem', padding: '0.875rem', marginBottom: '1.25rem' }}>
          <div style={{ width: '2.75rem', height: '2.75rem', borderRadius: '0.625rem', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#93c5fd', fontWeight: 900, fontSize: '0.875rem', flexShrink: 0 }}>
            {playerInfo!.first_name[0]}{playerInfo!.last_name[0]}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {playerInfo!.first_name} {playerInfo!.last_name}
            </p>
            <p style={{ color: '#60a5fa', fontSize: '0.8125rem', fontWeight: 600, marginTop: '0.125rem' }}>{playerInfo!.team_name}</p>
          </div>
          <span style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#93c5fd', fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            Joueur
          </span>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div className="animate-scale-in" role="alert" aria-live="polite"
              style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.625rem', padding: '0.75rem', color: '#fca5a5' }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '0.1rem', color: '#f87171' }} />
              <span style={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>{error}</span>
            </div>
          )}

          {/* Nom — lecture seule */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label className="label">Nom complet</label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-surface-raised)', border: '1px solid var(--color-surface-border)', borderRadius: '0.625rem', padding: '0 0.875rem', height: '2.875rem', cursor: 'not-allowed' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.9375rem', fontWeight: 600 }}>{playerInfo!.first_name} {playerInfo!.last_name}</span>
              <span style={{ color: '#475569', fontSize: '0.75rem', flexShrink: 0, marginLeft: '0.5rem' }}>🔒 Admin</span>
            </div>
          </div>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label htmlFor="email" className="label">Adresse email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} strokeWidth={2} style={iconStyle} />
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input input-icon-l" placeholder="vous@exemple.com" required autoComplete="email" />
            </div>
          </div>

          {/* Mot de passe */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label htmlFor="password" className="label">Mot de passe</label>
            <PasswordInput id="password" value={password} onChange={setPassword}
              placeholder="Minimum 8 caractères" autoComplete="new-password" required showStrength />
          </div>

          {/* Confirmation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label htmlFor="confirmPassword" className="label">Confirmer le mot de passe</label>
            <PasswordInput id="confirmPassword" value={confirmPassword} onChange={setConfirm}
              autoComplete="new-password" required showMatch={password} />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary" style={{ width: '100%', marginTop: '0.25rem' }}>
            {isLoading
              ? <><LoadingSpinner size="sm" /><span>Création...</span></>
              : <><span>Créer mon compte</span><ArrowRight size={16} strokeWidth={2.5} /></>
            }
          </button>
        </form>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem', marginTop: '1.5rem', textAlign: 'center' }}>
          <button onClick={() => navigate('/auth/login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: '0.8125rem', fontWeight: 600 }}>
            Déjà un compte ? <span style={{ color: '#60a5fa' }}>Se connecter</span>
          </button>
        </div>
      </div>
    </AuthLayout>
  )
}
