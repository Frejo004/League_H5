import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, User, ArrowRight, Check, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { AuthLayout } from '@/components/auth/AuthLayout'

const iconStyle = {
  position: 'absolute' as const,
  left: '0.75rem',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#475569',
  pointerEvents: 'none' as const,
  zIndex: 1,
}

export function SignupPage() {
  const navigate = useNavigate()
  const [fullName, setFullName]       = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPassword, setConfirm] = useState('')
  const [error, setError]             = useState<string | null>(null)
  const [success, setSuccess]         = useState(false)
  const [isLoading, setIsLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email))          { setError('Veuillez entrer un email valide.'); return }
    if (password !== confirmPassword)     { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8)             { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw error
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout>
        <div style={{ width: '100%', textAlign: 'center' }} className="animate-scale-in">
          <div style={{ width: '4rem', height: '4rem', borderRadius: '1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Check size={24} style={{ color: '#4ade80' }} strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc', marginBottom: '0.75rem' }}>Inscription réussie !</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Vérifiez votre email pour confirmer votre compte, puis connectez-vous. L'administrateur devra approuver votre accès.
          </p>
          <button onClick={() => navigate('/auth/login')} className="btn-primary" style={{ width: '100%' }}>
            <span>Aller à la connexion</span>
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="animate-fade-in-up" style={{ width: '100%' }}>

        <div style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '0.4rem' }}>
            Créer un compte
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Rejoignez votre ligue dès maintenant
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div className="animate-scale-in" role="alert" aria-live="polite"
              style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '0.625rem', padding: '0.75rem', color: '#fca5a5' }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '0.1rem', color: '#f87171' }} />
              <span style={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>{error}</span>
            </div>
          )}

          {/* Nom */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label htmlFor="fullName" className="label">Nom complet</label>
            <div style={{ position: 'relative' }}>
              <User size={16} strokeWidth={2} style={iconStyle} />
              <input id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                className="input input-icon-l" placeholder="Jean Dupont" required autoComplete="name" />
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
            {isLoading ? <LoadingSpinner size="sm" /> : <><span>Créer mon compte</span><ArrowRight size={16} strokeWidth={2.5} /></>}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ color: '#334155', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>ou</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
          Déjà un compte ?{' '}
          <Link to="/auth/login" style={{ color: '#60a5fa', fontWeight: 700, textDecoration: 'none' }}>Se connecter</Link>
        </p>
      </div>
    </AuthLayout>
  )
}
