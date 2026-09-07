import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { AuthLayout } from '@/components/auth/AuthLayout'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState<string | null>(null)
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) { setError('Veuillez entrer un email valide'); return }
    if (password.length < 6)     { setError('Le mot de passe doit contenir au moins 6 caractères'); return }
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="animate-fade-in-up" style={{ width: '100%' }}>

        {/* En-tête */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '0.5rem' }}>
            Bon retour 👋
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Connectez-vous pour accéder à votre ligue
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

          {/* Erreur */}
          {error && (
            <div
              className="animate-scale-in"
              role="alert"
              aria-live="polite"
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.625rem',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '0.625rem', padding: '0.75rem 0.875rem', color: '#fca5a5',
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '0.125rem', color: '#f87171' }} />
              <span style={{ fontSize: '0.8125rem', lineHeight: 1.5, fontWeight: 500 }}>{error}</span>
            </div>
          )}

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="email" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.01em' }}>
              Adresse email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                strokeWidth={2}
                style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none', zIndex: 1 }}
              />
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input input-icon-l"
                placeholder="vous@exemple.com"
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label htmlFor="password" style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.01em' }}>
                Mot de passe
              </label>
              <Link
                to="/auth/reset-password"
                style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}
              >
                Oublié ?
              </Link>
            </div>
            <PasswordInput
              id="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
              disabled={isLoading}
            />
          </div>

          {/* Bouton Se connecter */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              width: '100%', height: '3rem', marginTop: '0.25rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: '1px solid rgba(96,165,250,0.4)',
              borderRadius: '0.625rem', color: '#fff',
              fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(37,99,235,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
              transition: 'all 0.2s ease',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading
              ? <LoadingSpinner size="sm" />
              : <><span>Se connecter</span><ArrowRight size={16} strokeWidth={2.5} /></>
            }
          </button>
        </form>

        {/* Séparateur */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', margin: '1.5rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ color: '#334155', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>ou</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Liens */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
            Pas encore de compte ?{' '}
            <Link to="/auth/signup" style={{ color: '#60a5fa', fontWeight: 700, textDecoration: 'none' }}>
              Créer un compte
            </Link>
          </p>

          <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#334155', lineHeight: 1.6, padding: '0 0.25rem' }}>
            Accès spectateur ? Inscrivez-vous et attendez l'approbation de l'admin.
          </p>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.125rem', textAlign: 'center' }}>
            <Link
              to="/"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: '#334155', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
            >
              <ArrowLeft size={14} strokeWidth={2.5} />
              Retour à l'accueil
            </Link>
          </div>
        </div>

      </div>
    </AuthLayout>
  )
}
