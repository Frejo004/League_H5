import { useState, useRef, useMemo, useEffect } from 'react'
import {
  Camera, Check, Pencil, Mail,
  ShieldCheck, AlertCircle, Loader2,
  ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { useActiveSeason } from '@/hooks/useSeasons'
import { usePlayers } from '@/hooks/usePlayers'
import { usePlayerProfile } from '@/hooks/usePlayerProfile'
import { usePlayerMvp } from '@/hooks/useMvpVotes'
import { supabase } from '@/lib/supabase'
import { PasswordInput } from '@/components/ui/PasswordInput'

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
      <div className="absolute top-0 left-6 right-6 h-px bg-linear-to-r from-transparent via-primary-500/30 to-transparent" />
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

// ── PlayerStatsCard — stats saison du joueur lié au compte ──────────────────

function PlayerStatsCard({ userId }: { userId?: string }) {
  const { data: season } = useActiveSeason()
  const { data: allPlayers } = usePlayers(season?.id)
  const myPlayer = (allPlayers ?? []).find(p => p.user_id === userId)
  const { data: profile } = usePlayerProfile(myPlayer?.id)
  const { data: mvpData } = usePlayerMvp(myPlayer?.id, season?.id)

  if (!myPlayer || !profile) return null

  // Calcul d'une note globale fictive basée sur les perfs (juste pour le style "FUT")
  const matches = profile.matches_played || 1
  const goalRatio = (profile.goals / matches) * 10
  const assistRatio = (profile.assists / matches) * 10
  const baseRating = 75
  const rating = Math.min(99, Math.floor(baseRating + goalRatio + assistRatio + (mvpData?.total_mvp ?? 0) * 2))

  return (
    <div className="relative group w-full max-w-sm mx-auto mb-6 perspective-1000">
      {/* Carte style FUT avec effet Tilt */}
      <div className="relative overflow-hidden rounded-2xl p-0.5 transition-transform duration-500 transform-gpu group-hover:scale-105 group-hover:rotate-1"
           style={{ background: 'linear-gradient(135deg, #FFDF73 0%, #B8860B 50%, #FFDF73 100%)' }}>
        
        {/* Glow dynamique autour de la carte */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl pointer-events-none"
             style={{ background: 'inherit' }} />

        {/* Intérieur de la carte */}
        <div className="relative bg-slate-900 h-full rounded-2xl overflow-hidden p-5 flex flex-col bg-grid-pattern">
          {/* Overlay doré translucide */}
          <div className="absolute inset-0 bg-linear-to-b from-[#B8860B]/20 via-transparent to-[#B8860B]/40 pointer-events-none" />

          {/* TOP SECTION : Note + Avatar */}
          <div className="flex items-start justify-between relative z-10">
            {/* Note globale & Info */}
            <div className="flex flex-col items-center">
              <span className="text-5xl font-black text-transparent bg-clip-text bg-linear-to-b from-[#FFDF73] to-[#B8860B]"
                    style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {rating}
              </span>
              <span className="text-xs font-bold text-[#FFDF73] uppercase tracking-widest mt-1">
                {profile.position || 'JOU'}
              </span>
              {profile.team.logo_url ? (
                <img src={profile.team.logo_url} alt="" className="w-6 h-6 object-contain mt-2 opacity-80" />
              ) : (
                <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black text-slate-900 mt-2 bg-[#FFDF73]">
                  {profile.team.name[0]}
                </div>
              )}
            </div>

            {/* Photo Joueur (Avatar temporaire) */}
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[#B8860B] shadow-2xl relative z-10 bg-slate-800 flex items-center justify-center">
               <span className="text-4xl font-black text-slate-700" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                 {profile.first_name[0]}{profile.last_name[0]}
               </span>
               <div className="absolute inset-0 bg-linear-to-tr from-[#FFDF73]/20 to-transparent mix-blend-overlay" />
            </div>
          </div>

          {/* MILIEU : Nom du joueur */}
          <div className="text-center mt-4 border-b border-[#B8860B]/30 pb-3 relative z-10">
            <h2 className="text-2xl font-black text-[#FFDF73] tracking-widest uppercase"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {profile.last_name}
            </h2>
            <p className="text-xs text-[#FFDF73]/70 font-semibold uppercase tracking-wider">
              {profile.first_name}
            </p>
          </div>

          {/* BAS : Statistiques style FIFA */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 relative z-10 px-2">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-white/90 tabular-nums">{profile.matches_played}</span>
              <span className="text-[#FFDF73] uppercase tracking-wider text-[10px]">MAT</span>
            </div>
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-white/90 tabular-nums">{profile.goals}</span>
              <span className="text-[#FFDF73] uppercase tracking-wider text-[10px]">BUT</span>
            </div>
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-white/90 tabular-nums">{profile.assists}</span>
              <span className="text-[#FFDF73] uppercase tracking-wider text-[10px]">PAS</span>
            </div>
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-white/90 tabular-nums">{mvpData?.total_mvp ?? 0}</span>
              <span className="text-[#FFDF73] uppercase tracking-wider text-[10px]">MVP</span>
            </div>
          </div>

          {/* Bouton pour voir le profil complet */}
          <div className="mt-5 text-center relative z-10">
            <Link
              to={`/players/${myPlayer.slug || myPlayer.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold text-slate-900 bg-[#FFDF73] hover:bg-white transition-colors uppercase tracking-widest"
            >
              Voir Profil Complet <ArrowRight size={10} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { profile, user, refreshProfile, signOut } = useAuth()
  const qc = useQueryClient()

  const [displayName, setDisplayName] = useState(profile?.full_name ?? '')
  const [avatarBroken, setAvatarBroken] = useState(false)
  const [hasEditedName, setHasEditedName] = useState(false)

  useEffect(() => {
    // Ne réinitialise le nom que si l'utilisateur n'est pas en train d'éditer
    // (hasEditedName est mis à true dès la première frappe, remis à false après sauvegarde)
    if (!hasEditedName) {
      queueMicrotask(() => {
        setDisplayName(profile?.full_name ?? '')
      })
    }
  }, [profile?.full_name, hasEditedName])


  // L'URL en base contient déjà le cache-bust timestamp (ajouté à l'upload)
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
      // Chemin fixe dans le dossier de l'utilisateur — compatible avec la RLS
      // qui autorise name like auth.uid() || '/%'
      const path = `${user.id}/avatar`

      // Upsert direct : crée ou remplace le fichier existant
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true })
      if (uploadErr) throw uploadErr

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      // On ajoute un timestamp dans l'URL stockée en base pour forcer le
      // rechargement du cache navigateur partout dans l'app (Header, profils, etc.)
      const avatarUrlWithBust = `${data.publicUrl}?t=${Date.now()}`
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrlWithBust })
        .eq('id', user.id)
      if (dbErr) throw dbErr

      setAvatarBroken(false)
      await refreshProfile()
      // Invalide tous les caches qui affichent des avatars de joueurs
      qc.invalidateQueries({ queryKey: ['players'] })
      qc.invalidateQueries({ queryKey: ['teams', 'detail'] })
      qc.invalidateQueries({ queryKey: ['player_profile'] })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur upload avatar'
      // Message lisible si c'est une erreur RLS Supabase
      setAvatarError(msg.includes('row-level') || msg.includes('policy')
        ? 'Permission refusée. Vérifiez les politiques du bucket dans Supabase.'
        : msg
      )
    } finally {
      setAvatarUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── Nom ──────────────────────────────────────────────────
  const [nameLoading, setNameLoading] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [nameSuccess, setNameSuccess] = useState(false)

  async function handleNameChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = displayName.trim()
    if (!trimmed) return

    // Récupère l'utilisateur courant directement depuis Supabase auth
    // pour éviter un timing issue avec le state React (user peut être null
    // brièvement après un refresh de session)
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      setNameError('Session expirée. Veuillez vous reconnecter.')
      return
    }

    setNameError(null); setNameSuccess(false); setNameLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: trimmed })
        .eq('id', currentUser.id)
      if (error) throw error
      setNameSuccess(true)
      setHasEditedName(false)
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

  async function handleEmailChange(e: React.FormEvent<HTMLFormElement>) {
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
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [pwdSuccess, setPwdSuccess] = useState(false)

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPwdError(null); setPwdSuccess(false)
    if (newPwd !== confirmPwd) { setPwdError('Les mots de passe ne correspondent pas.'); return }
    if (newPwd.length < 8) { setPwdError('Minimum 8 caractères.'); return }
    setPwdLoading(true)
    try {
      // Supabase vérifie que la session est active avant d'autoriser updateUser.
      // On n'a pas besoin de re-vérifier le mot de passe actuel côté client —
      // cela évite de déclencher un événement SIGNED_IN parasite dans AuthContext.
      const { error } = await supabase.auth.updateUser({ password: newPwd })
      if (error) {
        if (error.message.toLowerCase().includes('same password')) {
          setPwdError('Le nouveau mot de passe doit être différent de l\'ancien.')
        } else {
          throw error
        }
        return
      }
      setPwdSuccess(true)
      setNewPwd(''); setConfirmPwd('')
    } catch (err: unknown) {
      setPwdError(err instanceof Error ? err.message : 'Erreur changement mot de passe')
    } finally {
      setPwdLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="max-w-lg space-y-4 pb-10">

      {/* ── Stats joueur (si lié à un joueur) ── */}
      <PlayerStatsCard userId={profile?.id} />

      {/* ── Hero card ── */}
      <div className="relative bg-slate-900/80 border border-slate-800/70 rounded-2xl overflow-hidden">
        {/* background stripe */}
        <div className="absolute inset-0 bg-linear-to-br from-primary-900/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-primary-500/40 to-transparent" />

        <div className="relative p-6 flex items-center gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-slate-700
                            bg-linear-to-br from-primary-600 to-primary-900
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
            value={displayName} 
            onChange={v => { 
              setDisplayName(v); 
              setHasEditedName(true); 
              setNameSuccess(false); 
              setNameError(null); 
            }}
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
      <SectionCard icon={<Pencil size={14} />} title="Changer le mot de passe">
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {pwdError && <Alert type="error">{pwdError}</Alert>}
          {pwdSuccess && <Alert type="success">Mot de passe mis à jour.</Alert>}
          <div className="space-y-1.5">
            <label htmlFor="newPwd" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Nouveau mot de passe
            </label>
            <PasswordInput
              id="newPwd" value={newPwd} onChange={setNewPwd}
              placeholder="Minimum 8 caractères"
              autoComplete="new-password" required
              showStrength
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmPwd" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Confirmer
            </label>
            <PasswordInput
              id="confirmPwd" value={confirmPwd} onChange={setConfirmPwd}
              autoComplete="new-password" required
              showMatch={newPwd}
            />
          </div>
          <SubmitButton loading={pwdLoading} label="Changer le mot de passe" loadingLabel="Mise à jour…" />
        </form>
      </SectionCard>

      {/* ── Déconnexion ── */}
      <div className="pt-4 border-t border-slate-800/50 mt-4">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                     bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold transition-all
                     border border-red-500/20"
        >
          <span>Se déconnecter</span>
        </button>
      </div>
    </div>
  )
}