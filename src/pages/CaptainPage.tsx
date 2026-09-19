import { useState, useRef } from 'react'
import { Crown, Pencil, Camera } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useUpdateTeam } from '@/hooks/useTeams'
import { useMyTeam } from '@/hooks/useMyTeam'
import { supabase } from '@/lib/supabase'
import { useStandings } from '@/hooks/useStandings'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { TeamWithCaptain } from '@/types/database'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { TeamView } from '@/components/captain/TeamView'

// ── Page principale capitaine ─────────────────────────────────────────────────

export function CaptainPage() {
  const { isCaptain } = useAuth()
  const { data: season } = useActiveSeason()
  // useMyTeam charge uniquement le joueur + l'équipe du capitaine connecté,
  // sans charger toute la liste des joueurs de la saison.
  const { myTeam, isLoading: teamLoading } = useMyTeam(season?.id)
  const { data: standings } = useStandings(season?.id)

  // Édition nom d'équipe
  const updateTeam = useUpdateTeam()
  const [editingName, setEditingName] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [nameError, setNameError] = useState('')

  // Upload logo équipe
  const logoRef = useRef<HTMLInputElement>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState('')

  if (!isCaptain) return <Navigate to="/dashboard" replace />

  // Caste vers TeamWithCaptain pour accéder aux champs étendus
  const myTeamTyped = myTeam as unknown as TeamWithCaptain | null

  function startEditName() {
    setTeamName(myTeamTyped?.name ?? '')
    setNameError('')
    setEditingName(true)
  }

  function cancelEditName() {
    setEditingName(false)
    setNameError('')
  }

  async function saveTeamName() {
    const trimmed = teamName.trim()
    if (!trimmed) { setNameError('Le nom ne peut pas être vide'); return }
    if (!myTeamTyped) return
    setNameError('')
    try {
      await updateTeam.mutateAsync({ id: myTeamTyped.id, name: trimmed, season_id: myTeamTyped.season_id })
      setEditingName(false)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setNameError(msg.includes('unique') ? 'Ce nom est déjà pris' : 'Erreur, réessaie')
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !myTeamTyped) return
    if (file.size > 2 * 1024 * 1024) { setLogoError('Max 2 Mo.'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setLogoError('Format : JPG, PNG ou WebP.'); return
    }
    setLogoError('')
    setLogoUploading(true)
    try {
      const path = `teams/${myTeamTyped.id}/logo`

      // Upsert direct : crée ou remplace le fichier existant
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type, upsert: true })
      if (uploadErr) throw uploadErr

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const logoUrlWithBust = `${data.publicUrl}?t=${Date.now()}`
      await updateTeam.mutateAsync({
        id: myTeamTyped.id,
        logo_url: logoUrlWithBust,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur upload'
      setLogoError(msg.includes('row-level') || msg.includes('policy')
        ? 'Permission refusée.'
        : 'Erreur upload, réessaie.')
    } finally {
      setLogoUploading(false)
      if (logoRef.current) logoRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Crown size={18} className="text-amber-400" />
        <h1 className="page-title">Mon Équipe</h1>
      </div>

      {!season || teamLoading ? (
        <Card className="p-0 overflow-hidden">
          <div className="empty-state py-6">
            {teamLoading
              ? <LoadingSpinner />
              : <p className="text-text-secondary text-sm">Aucune saison active.</p>
            }
          </div>
        </Card>
      ) : !myTeamTyped ? (
        <Card className="p-0 overflow-hidden">
          <EmptyState
            icon={<Crown size={20} />}
            title="Aucune équipe assignée"
            description="L'administrateur doit vous assigner comme capitaine d'une équipe."
            className="py-8"
          />
        </Card>
      ) : (
        <>
          {/* Premium Team Hero */}
          <Card className="relative overflow-hidden rounded-4xl border-primary-500/20 shadow-glow mb-6">
            {/* Background Mesh/Glow */}
            <div
              className="absolute inset-0 opacity-20 blur-3xl -z-10"
              style={{ backgroundColor: myTeamTyped.color ?? '#8b5cf6' }}
            />
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 p-8">
              {/* Logo Section */}
              <div className="relative group">
                <div
                  className="w-24 h-24 rounded-3xl flex items-center justify-center text-white font-black text-4xl overflow-hidden shadow-2xl transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundColor: myTeamTyped.color ?? '#16a34a' }}
                >
                  {myTeamTyped.logo_url
                    ? <img src={myTeamTyped.logo_url} alt="" className="w-full h-full object-cover" />
                    : myTeamTyped.name[0]
                  }
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={24} className="text-white animate-pulse" />
                  </div>
                </div>

                {/* Hidden Input & Button trigger */}
                 <button
                   onClick={() => logoRef.current?.click()}
                   disabled={logoUploading}
                   aria-label="Modifier le logo de l'équipe"
                   className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-primary-600 hover:bg-primary-500
                                border-4 border-surface flex items-center justify-center transition-all shadow-xl
                                hover:scale-110 active:scale-95 disabled:opacity-50"
                 >
                  {logoUploading ? <LoadingSpinner size="sm" /> : <Pencil size={12} className="text-white" />}
                </button>
                <input
                  ref={logoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>

              {/* Info Section */}
              <div className="flex-1 text-center md:text-left space-y-2">
                 <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                   <Badge variant="info" dot>
                     <Crown size={10} />
                     Capitaine
                   </Badge>
                   <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-text-muted">
                     {season.name}
                   </span>
                 </div>

                {editingName ? (
                  <div className="space-y-2">
                    <input
                      autoFocus
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveTeamName(); if (e.key === 'Escape') cancelEditName() }}
                      className="w-full max-w-md px-4 py-3 rounded-2xl bg-black/40 border border-primary-500
                                     text-text-primary text-2xl font-black focus:outline-none shadow-inner"
                      maxLength={40}
                    />
                     <div className="flex gap-2">
                       <Button size="sm" onClick={saveTeamName} loading={updateTeam.isPending ? 'Sauvegarde…' : undefined}>Sauver</Button>
                       <Button size="sm" variant="secondary" onClick={cancelEditName}>Annuler</Button>
                     </div>
                    {nameError && <p className="text-[10px] text-red-400 mt-1">{nameError}</p>}
                  </div>
                ) : (
                  <div className="group flex items-center justify-center md:justify-start gap-3">
                    <h1 className="text-3xl md:text-5xl font-black text-text-primary tracking-tighter truncate">
                      {myTeamTyped.name}
                    </h1>
                    <button
                      onClick={startEditName}
                      aria-label="Modifier le nom de l'équipe"
                      className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Pencil size={18} />
                    </button>
                  </div>
                )}
                {logoError && <p className="text-xs text-red-400 font-bold">{logoError}</p>}
              </div>

              {/* Quick Stats Summary */}
              {myTeamTyped && standings && (
                <div className="hidden lg:flex gap-8 px-8 py-4 rounded-3xl bg-surface-raised border border-surface-border">
                  <div className="text-center">
                    <p className="text-2xl font-black text-text-primary">
                      #{standings.findIndex(s => s.team_id === myTeamTyped.id) + 1 || '—'}
                    </p>
                    <p className="text-[9px] text-text-muted font-black uppercase tracking-[0.2em]">Rang</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-text-primary">
                      {standings.find(s => s.team_id === myTeamTyped.id)?.points ?? 0}
                    </p>
                    <p className="text-[9px] text-text-muted font-black uppercase tracking-[0.2em]">Points</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black text-text-primary">
                      {standings.find(s => s.team_id === myTeamTyped.id)?.played ?? 0}
                    </p>
                    <p className="text-[9px] text-text-muted font-black uppercase tracking-[0.2em]">Matchs</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Onglets */}
          <TeamView
            teamId={myTeamTyped.id}
            teamColor={myTeamTyped.color ?? '#16a34a'}
            seasonId={season.id}
          />
        </>
      )}
    </div>
  )
}
