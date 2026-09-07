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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) { setError('Veuillez entrer un email valide.'); return }
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
        <div className="w-full text-center animate-scale-in">
          <div className="w-24 h-24 rounded-3xl bg-green-500/15 border border-green-500/30
                          flex items-center justify-center mx-auto mb-8">
            <Check size={44} className="text-green-400" strokeWidth={2.5} />
          </div>
          <h2 className="text-4xl xl:text-5xl font-black text-white mb-4 leading-tight">Inscription réussie !</h2>
          <p className="text-slate-300 text-lg xl:text-xl mb-10 leading-relaxed font-medium">
            Vérifiez votre email pour confirmer votre compte, puis connectez-vous.
            L'administrateur devra approuver votre accès.
          </p>
          <button onClick={() => navigate('/auth/login')} className="btn-primary w-full">
            <span>Aller à la connexion</span>
            <ArrowRight size={20} strokeWidth={2.5} />
          </button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="w-full animate-fade-in-up">

        <div className="mb-10">
          <h2 className="text-4xl xl:text-5xl font-black text-white tracking-tight mb-3 leading-tight">
            Créer un compte
          </h2>
          <p className="text-slate-300 text-lg xl:text-xl leading-relaxed font-medium">
            Rejoignez votre ligue dès maintenant
          </p>
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

          {/* Nom */}
          <div className="space-y-2.5">
            <label htmlFor="fullName" className="label">Nom complet</label>
            <div className="relative">
              <User size={20} strokeWidth={2} className="absolute left-[1.05rem] top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input id="fullName" type="text" value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="input input-icon-l" placeholder="Jean Dupont"
                required autoComplete="name" />
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
              ? <LoadingSpinner size="sm" />
              : <><span>Créer mon compte</span><ArrowRight size={20} strokeWidth={2.5} /></>
            }
          </button>
        </form>

        {/* Séparateur "ou" */}
        <div className="flex items-center gap-5 my-10">
          <div className="flex-1 h-px bg-surface-border" />
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">ou</span>
          <div className="flex-1 h-px bg-surface-border" />
        </div>

        <p className="text-center text-lg text-slate-300 font-medium">
          Déjà un compte ?{' '}
          <Link to="/auth/login" className="text-primary-400 hover:text-primary-300 font-black transition-colors">
            Se connecter
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
