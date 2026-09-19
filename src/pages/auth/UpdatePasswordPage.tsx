import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { AuthLayout } from '@/components/auth/AuthLayout'

export function UpdatePasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword]       = useState('')
  const [confirmPassword, setConfirm] = useState('')
  const [error, setError]             = useState<string | null>(null)
  const [isLoading, setIsLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8)          { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="animate-fade-in-up" style={{ width: '100%' }}>

        <div style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '0.4rem' }}>
            Nouveau mot de passe
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Choisissez un mot de passe sécurisé
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
            <label htmlFor="password" className="label">Nouveau mot de passe</label>
            <PasswordInput id="password" value={password} onChange={setPassword}
              placeholder="Minimum 8 caractères" autoComplete="new-password" required showStrength />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            <label htmlFor="confirmPassword" className="label">Confirmer le mot de passe</label>
            <PasswordInput id="confirmPassword" value={confirmPassword} onChange={setConfirm}
              autoComplete="new-password" required showMatch={password} />
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary" style={{ width: '100%', marginTop: '0.25rem' }}>
            {isLoading ? <LoadingSpinner size="sm" /> : <><span>Mettre à jour</span><ArrowRight size={16} strokeWidth={2.5} /></>}
          </button>
        </form>
      </div>
    </AuthLayout>
  )
}
