import { useState, useRef, useMemo, useEffect, type FormEvent } from 'react'
import {
  Camera, Check, Pencil, Mail, Lock,
  ShieldCheck, AlertCircle, Loader2
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

// ── Helpers ──────────────────────────────────────────────────────────────────

function StatusBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; color: string }> = {
    admin: { label: 'Admin', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    captain: { label: 'Capitaine', color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
    player: { label: 'Joueur', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    spectator: { label: 'Spectateur', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  }
  const cfg = map[role] ?? { label: role, color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <ShieldCheck size={11} />
      {cfg.label}
    </span>
  )
}

function Alert({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
  const isError = type === 'error'
  return (
    <div className={`flex items-start gap-2.5 text-sm px-3.5 py-2.5 rounded-xl border
      ${isError
        ? 'bg-red-500/8 border-red-500/20 text-red-400'
        : 'bg-emerald-500/8 border-emerald-500/20 text-emerald-400'
      }`}
    >
      {isError ? <AlertCircle size={15} className="mt-0.5 shrink-0" /> : <Check size={15} className="mt-0.5 shrink-0" />}
      <span>{children}</span>
    </div>
  )
}

function SectionCard({
  icon, title, children
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="group relative bg-slate-900/60 border border-slate-800/70 rounded-2xl overflow-hidden
                    transition-all duration-300 hover:border-slate-700/70">
      {/* top accent line */}
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-primary-500/30 to-transparent" />
      <div className="p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="p-1.5 rounded-lg bg-primary-500/10 text-primary-400">{icon}</span>
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">{title}</h2>
        </div>
        {children}
      </div>
    </div>
  )
}

function FormField({
  id, label, type = 'text', value, onChange, placeholder, autoComplete, required
}: {
  id: string; label: string; type?: string; value: string
  onChange: (v: string) => void; placeholder?: string
  autoComplete?: string; required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      <input
        id={id} type={type} value={value} required={required}
        autoComplete={autoComplete} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 bg-slate-800/70 border border-slate-700/60 rounded-xl
                   text-white text-sm placeholder:text-slate-600
                   focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50
                   transition-all"
      />
    </div>
  )
}

function SubmitButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit" disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500
                 text-white text-sm font-semibold rounded-xl transition-all
                 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {loading ? loadingLabel : label}
    </button>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth()

  const [displayName, setDisplayName] = useState(profile?.full_name ?? '')
  const [avatarBroken, setAvatarBroken] = useState(false)
  const [hasEditedName, setHasEditedName] = useState(false)

  useEffect(() => {
    if (!hasEditedName) setDisplayName(profile?.full_name ?? '')
  }, [profile?.full_name]) // eslint-disable-line react-hooks/exhaustive-deps


  const avatarUrl = profile?.avatar_url ?? null

  const initials = useMemo(() => {
    const name = displayName || profile?.full_name
    return name
      ? name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
      : user?.email?.[0]?.toUpperCase() ?? '?'
  }, [displayName, profile?.full_name, user?.email])

  // ── Avatar ────────────────────────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (file.size > 2 * 1024 * 1024) { setAvatarError('Max 2 Mo.'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Format accepté : JPG, PNG ou WebP.'); return
    }
    setAvatarError(null); setAvatarUploading(true)
    try {
      // Fixed filename (no extension) avoids orphaned files on format change
      const path = `${user.id}/avatar`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}`
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id)
      setAvatarBroken(false)
      await refreshProfile()
    } catch (err: unknown) {
      setAvatarError(err instanceof Error ? err.message : 'Erreur upload')
    } finally {
      setAvatarUploading(false)
      // Reset input so the same file can be re-selected if needed
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── Nom ──────────────────────────────────────────────────
  const [nameLoading, setNameLoading] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSuccess, setNameSuccess] = useState(false)

  async function handleNameChange(e: FormEvent) {
    e.preventDefault()
    if (!user || !displayName.trim()) return
    setNameError(null); setNameSuccess(false); setNameLoading(true)
    try {
      const { error } = await supabase.from('profiles')
        .update({ full_name: displayName.trim() }).eq('id', user.id)
      if (error) throw error
      setNameSuccess(true); setHasEditedName(false)
      await refreshProfile()
    } catch (err: unknown) {
      setNameError(err instanceof Error ? err.message : 'Erreur mise à jour')
    } finally {
      setNameLoading(false)
    }
  }

  // ── Email ────────────────────────────────────────────────
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState(false)

  async function handleEmailChange(e: FormEvent) {
    e.preventDefault()
    setEmailError(null); setEmailSuccess(false); setEmailLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail })
      if (error) throw error
      setEmailSuccess(true); setNewEmail('')
    } catch (err: unknown) {
      setEmailError(err instanceof Error ? err.message : 'Erreur changement email')
    } finally {
      setEmailLoading(false)
    }
  }

  // ── Mot de passe ─────────────────────────────────────────
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSuccess, setPwdSuccess] = useState(false)

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault()
    setPwdError(null); setPwdSuccess(false)
    if (newPwd !== confirmPwd) { setPwdError('Les mots de passe ne correspondent pas.'); return }
    if (newPwd.length < 8) { setPwdError('Minimum 8 caractères.'); return }
    setPwdLoading(true)
    try {
      // Re-authenticate to verify current password before allowing the change
      const { error: siErr } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: currentPwd,
      })
      if (siErr) { setPwdError('Mot de passe actuel incorrect.'); return }
      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      setPwdSuccess(true)
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (err: unknown) {
      setPwdError(err instanceof Error ? err.message : 'Erreur changement mot de passe')
    } finally {
      setPwdLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="max-w-lg space-y-4 pb-10">

      {/* ── Hero card ── */}
      <div className="relative bg-slate-900/80 border border-slate-800/70 rounded-2xl overflow-hidden">
        {/* background stripe */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />

        <div className="relative p-6 flex items-center gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-slate-700
                            bg-gradient-to-br from-primary-600 to-primary-900
                            flex items-center justify-center text-white text-2xl font-black">
              {avatarUrl && !avatarBroken
                ? <img
                  src={avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => setAvatarBroken(true)}
                />
                : initials
              }
            </div>

            {/* Upload button */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-primary-600 hover:bg-primary-500
                         border-2 border-slate-900 flex items-center justify-center transition-colors"
              title="Changer la photo"
            >
              {avatarUploading
                ? <Loader2 size={12} className="text-white animate-spin" />
                : <Camera size={12} className="text-white" />
              }
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
              className="hidden" onChange={handleAvatarChange} />
          </div>

          {/* Identity */}
          <div className="min-w-0 flex-1">
            <p className="text-xl font-black text-white tracking-tight truncate">
              {displayName || user?.email?.split('@')[0] || '—'}
            </p>
            <p className="text-sm text-slate-500 mt-0.5 truncate">{user?.email}</p>
            <div className="mt-2">
              {profile?.role && <StatusBadge role={profile.role} />}
            </div>
            {avatarError && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <AlertCircle size={11} /> {avatarError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Nom affiché ── */}
      <SectionCard icon={<Pencil size={14} />} title="Nom affiché">
        <form onSubmit={handleNameChange} className="space-y-4">
          {nameError && <Alert type="error">{nameError}</Alert>}
          {nameSuccess && <Alert type="success">Nom mis à jour avec succès.</Alert>}
          <FormField
            id="displayName" label="Nom complet"
            value={displayName} onChange={v => { setDisplayName(v); setHasEditedName(true); setNameSuccess(false) }}
            placeholder="Jean Dupont" required
          />
          <SubmitButton loading={nameLoading} label="Enregistrer" loadingLabel="Enregistrement…" />
        </form>
      </SectionCard>

      {/* ── Email ── */}
      <SectionCard icon={<Mail size={14} />} title="Changer l'adresse email">
        <form onSubmit={handleEmailChange} className="space-y-4">
          {emailError && <Alert type="error">{emailError}</Alert>}
          {emailSuccess && <Alert type="success">Email de confirmation envoyé.</Alert>}
          <div className="text-xs text-slate-500">
            Adresse actuelle : <span className="text-slate-300">{user?.email}</span>
          </div>
          <FormField
            id="newEmail" label="Nouvelle adresse email" type="email"
            value={newEmail} onChange={setNewEmail}
            placeholder="nouvelle@exemple.com" autoComplete="email" required
          />
          <SubmitButton loading={emailLoading} label="Changer l'email" loadingLabel="Envoi…" />
        </form>
      </SectionCard>

      {/* ── Mot de passe ── */}
      <SectionCard icon={<Lock size={14} />} title="Changer le mot de passe">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {pwdError && <Alert type="error">{pwdError}</Alert>}
          {pwdSuccess && <Alert type="success">Mot de passe mis à jour.</Alert>}
          <FormField
            id="currentPwd" label="Mot de passe actuel" type="password"
            value={currentPwd} onChange={setCurrentPwd}
            placeholder="••••••••" autoComplete="current-password" required
          />
          <FormField
            id="newPwd" label="Nouveau mot de passe" type="password"
            value={newPwd} onChange={setNewPwd}
            placeholder="Minimum 8 caractères" autoComplete="new-password" required
          />
          <FormField
            id="confirmPwd" label="Confirmer" type="password"
            value={confirmPwd} onChange={setConfirmPwd}
            placeholder="••••••••" autoComplete="new-password" required
          />
          <SubmitButton loading={pwdLoading} label="Changer le mot de passe" loadingLabel="Mise à jour…" />
        </form>
      </SectionCard>

    </div>
  )
}