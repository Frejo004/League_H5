import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AuthLayout } from '@/components/auth/AuthLayout'

export function ResetPasswordPage() {
  const [email, setEmail]       = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (error) throw error
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la réinitialisation')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout>
        <div style={{ width: '100%', textAlign: 'center' }} className="animate-scale-in">
          <div style={{ width: '4rem', height: '4rem', borderRadius: '1rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.75rem' }}>
            📧
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f8fafc', marginBottom: '0.75rem' }}>Email envoyé !</h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Vérifiez votre boîte mail. Vous recevrez un lien pour réinitialiser votre mot de passe.
          </p>
          <Link to="/auth/login" className="btn-primary" style={{ width: '100%', display: 'flex' }}>
            <ArrowLeft size={16} strokeWidth={2.5} />
            <span>Retour à la connexion</span>
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="animate-fade-in-up" style={{ width: '100%' }}>

        <div style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '0.4rem' }}>
            Mot de passe oublié
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Entrez votre email pour recevoir un lien de réinitialisation
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label htmlFor="email" className="label">Adresse email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} strokeWidth={2} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none', zIndex: 1 }} />
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input input-icon-l" placeholder="vous@exemple.com" required autoComplete="email" />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary" style={{ width: '100%', marginTop: '0.25rem' }}>
            {isLoading ? <LoadingSpinner size="sm" /> : <><span>Envoyer le lien</span><ArrowRight size={16} strokeWidth={2.5} /></>}
          </button>
        </form>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem', marginTop: '1.5rem', textAlign: 'center' }}>
          <Link to="/auth/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: '#475569', fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}>
            <ArrowLeft size={14} strokeWidth={2.5} />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
