import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { useAuth } from '@/hooks/useAuth'

export function ResetPasswordPage() {
  const { profile } = useAuth()
  const logoLink = profile ? '/dashboard' : '/'
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
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
        <div className="w-full text-center animate-scale-in">
          <div className="w-28 h-28 rounded-3xl bg-blue-500/15 border-2 border-blue-500/35
                          flex items-center justify-center mx-auto mb-8">
            <span className="text-6xl">📧</span>
          </div>
          <h2 className="text-4xl xl:text-5xl font-black text-white mb-4 leading-tight">Email envoyé !</h2>
          <p className="text-slate-300 text-lg xl:text-xl mb-10 leading-relaxed font-medium max-w-xl mx-auto">
            Vérifiez votre boîte mail. Vous recevrez un lien pour réinitialiser votre mot de passe.
          </p>
          <Link to="/auth/login" className="btn-primary w-full">
            <ArrowLeft size={20} strokeWidth={2.5} />
            <span>Retour à la connexion</span>
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="w-full animate-fade-in-up">
        <div className="mb-10">
          <h2 className="text-4xl xl:text-5xl font-black text-white tracking-tight mb-3 leading-tight">
            Mot de passe oublié
          </h2>
          <p className="text-slate-300 text-lg xl:text-xl leading-relaxed font-medium">
            Entrez votre email pour recevoir un lien de réinitialisation
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
          <div className="space-y-2.5">
            <label htmlFor="email" className="label">Adresse email</label>
            <div className="relative">
              <Mail size={20} strokeWidth={2} className="absolute left-[1.05rem] top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input input-icon-l" placeholder="vous@exemple.com" required autoComplete="email" />
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="btn-primary w-full mt-2">
            {isLoading ? <LoadingSpinner size="sm" /> : <><span>Envoyer le lien</span><ArrowRight size={20} strokeWidth={2.5} /></>}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-surface-border text-center">
          <Link to="/auth/login" className="inline-flex items-center gap-2 text-lg text-slate-400 hover:text-slate-200 transition-colors font-bold">
            <ArrowLeft size={20} strokeWidth={2.25} />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
