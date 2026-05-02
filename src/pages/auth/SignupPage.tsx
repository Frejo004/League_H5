import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AuthLayout } from '@/components/auth/AuthLayout'

export function SignupPage() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 8) { setError('Le mot de passe doit contenir au moins 8 caractères.'); return }
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
          <div className="w-20 h-20 rounded-full bg-primary-600/20 border-2 border-primary-500/40
                          flex items-center justify-center mx-auto mb-6 shadow-glow">
            <Check size={36} className="text-primary-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Inscription réussie !</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Vérifiez votre email pour confirmer votre compte. Une fois confirmé, vous pourrez vous connecter.
          </p>
          <button onClick={() => navigate('/auth/login')} className="btn-primary w-full py-3">
            Aller à la connexion <ArrowRight size={16} />
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-sm animate-fade-in-up">

        <div className="mb-8">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 bg-primary-500 rounded-xl blur-md opacity-60" />
              <div className="relative w-10 h-10 bg-linear-to-br from-primary-400 to-primary-700 rounded-xl flex items-center justify-center">
                <span className="text-xl">⚽</span>
              </div>
            </div>
            <span className="text-white font-bold text-lg">League H5</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">Créer un compte</h2>
          <p className="text-slate-400 mt-2">Rejoignez votre ligue dès maintenant</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 text-red-400 text-sm px-4 py-3 rounded-xl animate-scale-in">
              <span className="mt-0.5 flex-shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="fullName" className="label">Nom complet</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input id="fullName" type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                className="input pl-10" placeholder="Jean Dupont" required autoComplete="name" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="label">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input pl-10" placeholder="vous@exemple.com" required autoComplete="email" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="label">Mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input pl-10" placeholder="Minimum 8 caractères" required autoComplete="new-password" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="label">Confirmer le mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="input pl-10" placeholder="••••••••" required autoComplete="new-password" />
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2 py-3 text-base">
            {isLoading ? <LoadingSpinner size="sm" /> : <><span>Créer mon compte</span><ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-surface-border/60" />
          <span className="text-xs text-slate-600 font-medium">ou</span>
          <div className="flex-1 h-px bg-surface-border/60" />
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
