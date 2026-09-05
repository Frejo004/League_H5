import { useState, useRef, useMemo, useEffect } from 'react'
import {
  Camera, Check, Pencil, Mail,
  ShieldCheck, AlertCircle, Loader2,
  ArrowRight, Bell, Calendar, Trophy, Users, Shield, Zap,
  Newspaper, Star, Send,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { useActiveSeason } from '@/hooks/useSeasons'
import { usePlayers } from '@/hooks/usePlayers'
import { usePlayerProfile } from '@/hooks/usePlayerProfile'
import { usePlayerMvp } from '@/hooks/useMvpVotes'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'
import { useTransfers } from '@/hooks/useTransfers'
import { useTeams } from '@/hooks/useTeams'
import { supabase } from '@/lib/supabase'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { RoleBadge, TransferStatusBadge } from '@/components/ui/StatusBadges'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { SectionHeader } from '@/components/ui/SectionHeader'

// ── Helpers ──────────────────────────────────────────────────────────────────

function Alert({ type, children }: { type: 'error' | 'success'; children: React.ReactNode }) {
  const isError = type === 'error'
  return (
    <div className={`flex items-start gap-2.5 text-sm px-3.5 py-2.5 rounded-xl border
      ${isError
        ? 'bg-red-500/10 border-red-500/20 text-red-400'
        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
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
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border flex items-center gap-2.5">
        <span className="p-1.5 rounded-lg bg-primary-500/10 text-primary-400">{icon}</span>
        <h2 className="text-sm font-bold text-text-primary tracking-wide uppercase">{title}</h2>
      </div>
      <div className="p-5">
        {children}
      </div>
    </Card>
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
      <label htmlFor={id} className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
        {label}
      </label>
      <input
        id={id} type={type} value={value} required={required}
        autoComplete={autoComplete} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 bg-surface-raised border border-surface-border rounded-xl
                   text-text-primary text-sm placeholder:text-text-muted
                   focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50
                   transition-all"
      />
    </div>
  )
}

function SubmitButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <Button type="submit" disabled={loading} loading={loading ? loadingLabel : undefined} className="w-full">
      {label}
    </Button>
  )
}

function NotificationToggle({
  label, description, icon, value, onChange, disabled
}: {
  label: string; description?: string; icon: React.ReactNode; value: boolean;
  onChange: (v: boolean) => void; disabled?: boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 border-b border-surface-border last:border-0 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400 shrink-0">
          {icon}
        </div>
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-text-primary">{label}</p>
          {description && (
            <p className="text-xs text-text-muted">{description}</p>
          )}
        </div>
      </div>
      <button
        onClick={() => onChange(!value)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
          value ? 'bg-primary-600' : 'bg-surface-muted'
        } ${disabled ? 'cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

function invalidateIdentityQueries(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['players'] })
  qc.invalidateQueries({ queryKey: ['teams'] })
  qc.invalidateQueries({ queryKey: ['player_profile'] })
  qc.invalidateQueries({ queryKey: ['matches'] })
  qc.invalidateQueries({ queryKey: ['scorers'] })
  qc.invalidateQueries({ queryKey: ['assists'] })
  qc.invalidateQueries({ queryKey: ['mvp_votes'] })
  qc.invalidateQueries({ queryKey: ['mvp_ranking'] })
  qc.invalidateQueries({ queryKey: ['player_mvp'] })
  qc.invalidateQueries({ queryKey: ['disciplinary-stats'] })
  qc.invalidateQueries({ queryKey: ['player-discipline'] })
  qc.invalidateQueries({ queryKey: ['suspensions'] })
  qc.invalidateQueries({ queryKey: ['all-players-for-dm'] })
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
        <div className="relative bg-background h-full rounded-2xl overflow-hidden p-5 flex flex-col bg-grid-pattern">
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
                <div className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-black text-background mt-2 bg-gold-400">
                  {profile.team.name[0]}
                </div>
              )}
            </div>

            {/* Photo Joueur (Avatar temporaire) */}
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gold-500 shadow-2xl relative z-10 bg-surface-raised flex items-center justify-center">
               {profile.avatar_url ? (
                 <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
               ) : (
                  <span className="text-4xl font-black text-text-muted" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {profile.first_name[0]}{profile.last_name[0]}
                  </span>
               )}
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
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-bold text-background bg-gold-400 hover:bg-white transition-colors uppercase tracking-widest"
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
  const { data: prefs, isLoading: prefsLoading, togglePreference } = useNotificationPreferences()
  const { data: season } = useActiveSeason()
  const { data: allPlayers } = usePlayers(season?.id)
  const { data: teams } = useTeams(season?.id)
  const { data: transfers, createTransfer } = useTransfers()
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [transferReason, setTransferReason] = useState('')

  const myPlayer = (allPlayers ?? []).find(p => p.user_id === profile?.id)
  const myTransfers = (transfers ?? []).filter(t => t.player_id === myPlayer?.id)
  const pendingTransfers = myTransfers.filter(t => ['player_requested', 'home_captain_approved', 'admin_approved'].includes(t.status))
  const hasReachedLimit = pendingTransfers.length >= 2
  const hasDuplicateTeam = selectedTeamId && pendingTransfers.some(t => t.to_team_id === selectedTeamId)
  const canCreateTransfer = !hasReachedLimit && !hasDuplicateTeam

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
      const { error: dbErr } = await (supabase.from('profiles') as any)
        .update({ avatar_url: avatarUrlWithBust })
        .eq('id', user.id)
      if (dbErr) throw dbErr

      setAvatarBroken(false)
      await refreshProfile()
      invalidateIdentityQueries(qc)
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
      const { error } = await (supabase.from('profiles') as any)
        .update({ full_name: trimmed })
        .eq('id', currentUser.id)
      if (error) throw error
      setNameSuccess(true)
      setHasEditedName(false)
      await refreshProfile()
      invalidateIdentityQueries(qc)
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
      <Card className="p-0 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-primary-900/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative p-6 flex items-center gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-surface-border
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
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-primary-600 hover:bg-primary-500 shadow-lg
                         border-2 border-surface flex items-center justify-center transition-colors"
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
            <p className="text-xl font-black text-text-primary tracking-tight truncate">
              {displayName || user?.email?.split('@')[0] || '—'}
            </p>
            <p className="text-sm text-text-muted mt-0.5 truncate">{user?.email}</p>
            <div className="mt-2">
              {profile?.role && <RoleBadge role={profile.role} />}
            </div>
            {avatarError && (
              <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                <AlertCircle size={11} /> {avatarError}
              </p>
            )}
          </div>
        </div>
      </Card>

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
          <div className="text-xs text-text-muted">
            Adresse actuelle : <span className="text-text-secondary">{user?.email}</span>
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
            <label htmlFor="newPwd" className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
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
            <label htmlFor="confirmPwd" className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
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

      {/* ── Transferts ── */}
      {profile?.role === 'player' && myPlayer && (
        <SectionCard icon={<Send size={14} />} title="Demande de transfert">
          {myTransfers.length > 0 && (
               <div className="space-y-3 mb-6">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Historique des demandes</h3>
                {myTransfers.map(transfer => (
                  <Card key={transfer.id} className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm">
                        <p className="text-text-primary font-medium">
                          {transfer.from_team?.name || 'Sans équipe'} → {transfer.to_team?.name}
                        </p>
                        {transfer.reason && <p className="text-text-muted text-xs mt-1">{transfer.reason}</p>}
                      </div>
                      <TransferStatusBadge status={transfer.status} />
                    </div>
                    <p className="text-xs text-text-muted mt-2">
                      {new Date(transfer.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </Card>
                ))}
              </div>
          )}

          {canCreateTransfer ? (
            <form onSubmit={(e) => {
              e.preventDefault()
              if (!selectedTeamId || !myPlayer) return
              createTransfer.mutate({
                player_id: myPlayer.id,
                from_team_id: myPlayer.team_id,
                to_team_id: selectedTeamId,
                reason: transferReason || undefined,
              })
            }} className="space-y-4">
               <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Équipe de destination
                </label>
                <select
                  value={selectedTeamId || ''}
                  onChange={(e) => setSelectedTeamId(e.target.value || null)}
                  className="w-full px-3.5 py-2.5 bg-surface-raised border border-surface-border rounded-xl
                             text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                >
                  <option value="">Sélectionner une équipe</option>
                  {(teams || [])
                    .filter(team => team.id !== myPlayer.team_id && !pendingTransfers.some(t => t.to_team_id === team.id))
                    .map(team => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Raison (optionnel)
                </label>
                <textarea
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-surface-raised border border-surface-border rounded-xl
                             text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                  placeholder="Expliquez pourquoi vous voulez changer d'équipe..."
                />
              </div>

              <Button type="submit" disabled={!selectedTeamId || !canCreateTransfer || createTransfer.isPending} loading={createTransfer.isPending ? 'Envoi…' : undefined} className="w-full">
                <Send size={14} /> Envoyer la demande
              </Button>
            </form>
          ) : (
            <div className="text-sm text-text-muted">
              {hasReachedLimit
                ? 'Vous avez déjà 2 demandes de transfert en attente. Attendez qu\'elles soient traitées avant d\'en soumettre une nouvelle.'
                : hasDuplicateTeam
                  ? 'Vous avez déjà une demande en attente pour cette équipe.'
                  : 'Vous avez déjà une demande de transfert en attente.'}
            </div>
          )}
        </SectionCard>
      )}

      {/* ── Paramètres de notifications ── */}
      <SectionCard icon={<Bell size={14} />} title="Paramètres de notifications">
        {prefsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="text-primary-400 animate-spin" />
          </div>
        ) : prefs ? (
          <div className="-mx-2">
            <NotificationToggle
              label="Matchs à venir"
              description="Être notifié avant le début des matchs"
              icon={<Calendar size={16} />}
              value={prefs.match_upcoming}
              onChange={(v) => togglePreference.mutate({ key: 'match_upcoming', value: v })}
            />
            <NotificationToggle
              label="Résultats de matchs"
              description="Recevoir les résultats des matchs terminés"
              icon={<Trophy size={16} />}
              value={prefs.match_completed}
              onChange={(v) => togglePreference.mutate({ key: 'match_completed', value: v })}
            />
            <NotificationToggle
              label="Vote MVP ouvert"
              description="Être notifié quand un vote MVP est disponible"
              icon={<Star size={16} />}
              value={prefs.mvp_vote_open}
              onChange={(v) => togglePreference.mutate({ key: 'mvp_vote_open', value: v })}
            />
            <NotificationToggle
              label="Invitations en attente"
              description="Alerte pour les invitations à rejoindre une équipe"
              icon={<Users size={16} />}
              value={prefs.invite_pending}
              onChange={(v) => togglePreference.mutate({ key: 'invite_pending', value: v })}
            />
            <NotificationToggle
              label="Invitation expirante"
              description="Alerte quand une invitation est sur le point d'expirer"
              icon={<AlertCircle size={16} />}
              value={prefs.invite_expiring}
              onChange={(v) => togglePreference.mutate({ key: 'invite_expiring', value: v })}
            />
            <NotificationToggle
              label="Sélection tactique"
              description="Être notifié quand vous êtes sélectionné pour un match"
              icon={<Zap size={16} />}
              value={prefs.tactique_selected}
              onChange={(v) => togglePreference.mutate({ key: 'tactique_selected', value: v })}
            />
            <NotificationToggle
              label="Actualités de la ligue"
              description="Recevoir les annonces et actualités de la ligue"
              icon={<Newspaper size={16} />}
              value={prefs.league_news}
              onChange={(v) => togglePreference.mutate({ key: 'league_news', value: v })}
            />
            {profile?.role === 'admin' && (
              <NotificationToggle
                label="Demandes de spectateurs"
                description="Être notifié quand un nouveau spectateur demande l'accès"
                icon={<Shield size={16} />}
                value={prefs.spectator_request}
                onChange={(v) => togglePreference.mutate({ key: 'spectator_request', value: v })}
              />
            )}
            <NotificationToggle
              label="Approbation de spectateur"
              description="Être notifié quand votre demande de spectateur est acceptée"
              icon={<ShieldCheck size={16} />}
              value={prefs.spectator_approved}
              onChange={(v) => togglePreference.mutate({ key: 'spectator_approved', value: v })}
            />
          </div>
        ) : null}
      </SectionCard>

      {/* ── Déconnexion ── */}
      <div className="pt-4 border-t border-surface-border mt-4">
        <Button variant="danger" onClick={signOut} className="w-full">
          Se déconnecter
        </Button>
      </div>
    </div>
  )
}
