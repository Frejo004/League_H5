import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { AuthLayout } from '@/components/auth/AuthLayout'

export function ResetPasswordPage() {
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
        <div className="w-full max-w-sm text-center animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-blue-500/20 border-2 border-blue-500/40
                          flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">📧</span>
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Email envoyé !</h2>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Vérifiez votre boîte mail. Vous recevrez un lien pour réinitialiser votre mot de passe.
          </p>
          <Link to="/auth/login" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            Retour à la connexion
          </Link>
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
              <div className="relative w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-700 rounded-xl flex items-center justify-center">
                <span className="text-xl">⚽</span>
              </div>
            </div>
            <span className="text-white font-bold text-lg">League H5</span>
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">Mot de passe oublié</h2>
          <p className="text-slate-400 mt-2">Entrez votre email pour recevoir un lien de réinitialisation</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/25 text-red-400 text-sm px-4 py-3 rounded-xl">
              <span className="mt-0.5">⚠️</span><span>{error}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="email" className="label">Adresse email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input pl-10" placeholder="vous@exemple.com" required autoComplete="email" />
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="btn-primary w-full py-3 text-base">
            {isLoading ? <LoadingSpinner size="sm" /> : <><span>Envoyer le lien</span><ArrowRight size={16} /></>}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/auth/login" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft size={14} />
            Retour à la connexion
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
