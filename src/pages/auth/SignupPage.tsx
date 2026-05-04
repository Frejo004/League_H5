import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, User, ArrowRight, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { AuthLayout } from '@/components/auth/AuthLayout'

export function SignupPage() {
  const navigate = useNavigate()
  const [fullName, setFullName]           = useState('')
  const [email, setEmail]                 = useState('')
  const [password, setPassword]           = useState('')
  const [confirmPassword, setConfirm]     = useState('')
  const [error, setError]                 = useState<string | null>(null)
  const [success, setSuccess]             = useState(false)
  const [isLoading, setIsLoading]         = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8)          { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
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
        <div className="w-full max-w-sm text-center animate-scale-in">
          <div className="w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30
                          flex items-center justify-center mx-auto mb-5">
            <Check size={28} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Inscription réussie !</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Vérifiez votre email pour confirmer votre compte, puis connectez-vous.
            L'administrateur devra approuver votre accès.
          </p>
          <button onClick={() => navigate('/auth/login')} className="btn-primary w-full py-2.5">
            Aller à la connexion <ArrowRight size={15} />
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm animate-fade-in-up">

        <div className="mb-7">
          <h2 className="text-2xl font-bold text-white tracking-tight">Créer un compte</h2>
          <p className="text-slate-400 mt-1.5 text-sm">Rejoignez votre ligue dès maintenant</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/25
                            text-red-400 text-sm px-3.5 py-3 rounded-lg animate-scale-in">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Nom */}
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="label">Nom complet</label>
            <div className="relative">
              <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input id="fullName" type="text" value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="input input-icon-l" placeholder="Jean Dupont"
                required autoComplete="name" />
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
              ? <LoadingSpinner size="sm" />
              : <><span>Créer mon compte</span><ArrowRight size={15} /></>
            }
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-surface-border" />
          <span className="text-xs text-slate-600 font-medium">ou</span>
          <div className="flex-1 h-px bg-surface-border" />
        </div>

        <p className="text-center text-sm text-slate-400">
          Déjà un compte ?{' '}
          <Link to="/auth/login" className="text-primary-400 hover:text-primary-300 font-semibold transition-colors">
            Se connecter
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
