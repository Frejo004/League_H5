import { useState, useRef, type FormEvent } from 'react'
import { UserCircle, Mail, Lock, Camera, Check } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function ProfilePage() {
  const { profile, user } = useAuth()

  // ── Avatar ──────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('La photo ne doit pas dépasser 2 Mo.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Format accepté : JPG, PNG ou WebP.')
      return
    }

    setAvatarError(null)
    setAvatarUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${user.id}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = `${data.publicUrl}?t=${Date.now()}` // cache-bust

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
      if (profileError) throw profileError

      setAvatarUrl(publicUrl)
    } catch (err: unknown) {
      setAvatarError(err instanceof Error ? err.message : 'Erreur lors du téléchargement')
    } finally {
      setAvatarUploading(false)
    }
  }

  // ── Email ────────────────────────────────────────────────
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState(false)

  async function handleEmailChange(e: FormEvent) {
    e.preventDefault()
    setEmailError(null)
    setEmailSuccess(false)
    setEmailLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      setEmailSuccess(true)
      setNewEmail('')
    } catch (err: unknown) {
      setEmailError(err instanceof Error ? err.message : 'Erreur lors du changement')
    } finally {
      setEmailLoading(false)
    }
  }

  // ── Password ─────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setPasswordLoading(true)
    try {
      // Re-authenticate first to verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPassword,
      })
      if (signInError) throw new Error('Mot de passe actuel incorrect.')

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : 'Erreur lors du changement')
    } finally {
      setPasswordLoading(false)
    }
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <UserCircle className="text-primary-400" size={24} />
        <h1 className="text-2xl font-bold text-white">Mon profil</h1>
      </div>

      {/* ── Avatar & identity ── */}
      <div className="card flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full bg-primary-700 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-600 hover:bg-primary-500 rounded-full flex items-center justify-center transition-colors shadow-lg"
            title="Changer la photo"
          >
            {avatarUploading ? <LoadingSpinner size="sm" /> : <Camera size={13} className="text-white" />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <div className="min-w-0">
          <p className="text-white font-semibold text-lg">{profile?.full_name ?? '—'}</p>
          <p className="text-slate-400 text-sm">{user?.email}</p>
          <span className="badge bg-primary-600/20 text-primary-400 border border-primary-600/30 mt-1 capitalize">
            {profile?.role ?? '—'}
          </span>
          {avatarError && (
            <p className="text-red-400 text-xs mt-1">{avatarError}</p>
          )}
        </div>
      </div>

      {/* ── Change email ── */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Mail size={16} className="text-primary-400" />
          Changer l'adresse email
        </h2>
        <p className="text-sm text-slate-400">
          Adresse actuelle : <span className="text-slate-300">{user?.email}</span>
        </p>
        <form onSubmit={handleEmailChange} className="space-y-3">
          {emailError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">
              {emailError}
            </div>
          )}
          {emailSuccess && (
            <div className="bg-primary-600/10 border border-primary-600/30 text-primary-400 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
              <Check size={14} />
              Un email de confirmation a été envoyé à la nouvelle adresse.
            </div>
          )}
          <div>
            <label htmlFor="newEmail" className="label">Nouvelle adresse email</label>
            <input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="input"
              placeholder="nouvelle@exemple.com"
              required
              autoComplete="email"
            />
          </div>
          <button
            type="submit"
            disabled={emailLoading || !newEmail}
            className="btn-primary flex items-center gap-2"
          >
            {emailLoading ? <LoadingSpinner size="sm" /> : null}
            {emailLoading ? 'Envoi...' : 'Changer l\'email'}
          </button>
        </form>
      </div>

      {/* ── Change password ── */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Lock size={16} className="text-primary-400" />
          Changer le mot de passe
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          {passwordError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="bg-primary-600/10 border border-primary-600/30 text-primary-400 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
              <Check size={14} />
              Mot de passe mis à jour avec succès.
            </div>
          )}
          <div>
            <label htmlFor="currentPassword" className="label">Mot de passe actuel</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="label">Nouveau mot de passe</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="input"
              placeholder="Minimum 8 caractères"
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label htmlFor="confirmNewPassword" className="label">Confirmer le nouveau mot de passe</label>
            <input
              id="confirmNewPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={passwordLoading}
            className="btn-primary flex items-center gap-2"
          >
            {passwordLoading ? <LoadingSpinner size="sm" /> : null}
            {passwordLoading ? 'Mise à jour...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}
