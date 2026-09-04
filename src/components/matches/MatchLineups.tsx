import { useState, useMemo } from 'react'
import { Users, UserCheck, Shield, Edit3, Layout, ShieldAlert, UserX } from 'lucide-react'
import { useMatchLineups, useUpdateMatchLineup, type MatchLineup } from '@/hooks/useLineups'
import { usePlayersByTeam } from '@/hooks/usePlayers'
import { useAuth } from '@/hooks/useAuth'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useSuspensions } from '@/hooks/useDisciplinaryStats'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { useRealtimeMatchTactics } from '@/hooks/useRealtime'
import type { TeamRef } from '@/types/database'
import { FORMATIONS } from '@/components/matches/formations'

interface MatchLineupsProps {
  matchId: string
  homeTeam: TeamRef
  awayTeam: TeamRef
  scheduledAt?: string | null
  homeFormation?: string
  awayFormation?: string
}

interface LineupEditorProps {
  matchId: string
  teamId: string
  onClose: () => void
  initialStarters: string[]
  initialSubs: string[]
  initialFormation: string
  teamColor: string
  suspendedPlayerIds: string[]
}

interface FullMatchPitchProps {
  homePlayers: MatchLineup[]
  awayPlayers: MatchLineup[]
  homeColor: string
  awayColor: string
  homeFormation: string
  awayFormation: string
  suspendedPlayerIds: string[]
}

interface PitchPartProps {
  players: MatchLineup[]
  teamColor: string
  formation: string
  side: 'left' | 'right'
  suspendedPlayerIds: string[]
}

export function MatchLineups({ matchId, homeTeam, awayTeam, scheduledAt }: MatchLineupsProps) {
  const { isCaptain, profile } = useAuth()

  // Initialiser sur l'équipe du capitaine s'il fait partie du match
  const defaultTab = useMemo(() => {
    if (isCaptain) {
      if (homeTeam.captain_id === profile?.id) return 'home'
      if (awayTeam.captain_id === profile?.id) return 'away'
    }
    return 'both'
  }, [isCaptain, homeTeam.captain_id, awayTeam.captain_id, profile?.id])

  const [activeTab, setActiveTab] = useState<'home' | 'away' | 'both'>(defaultTab)
  const { data: season } = useActiveSeason()
  const { data: suspensions = [] } = useSuspensions(season?.id)
  const { data: lineups, isLoading } = useMatchLineups(matchId)

  const suspendedPlayerIds = useMemo(() =>
    suspensions.filter(s => s.is_active).map(s => s.player_id),
    [suspensions]
  )

  const [isEditing, setIsEditing] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'pitch'>('pitch')

  // Activer les mises à jour temps réel pour les tactiques
  // On utilise useRealtimeMatchTactics (sans teamId) pour écouter les deux équipes
  useRealtimeMatchTactics(matchId)

  const activeTeam = activeTab === 'away' ? awayTeam : homeTeam
  const teamLineup = lineups?.filter(l => l.team_id === activeTeam.id) ?? []

  // Détecter les formations pour les deux équipes
  const homeFormationDetected = useMemo(() => {
    const homeLineup = lineups?.filter(l => l.team_id === homeTeam.id && l.is_starter)
    const firstPos = homeLineup?.find(l => l.position?.includes(':'))?.position
    return firstPos?.split(':')[0] || '2-1-1'
  }, [lineups, homeTeam.id])

  const awayFormationDetected = useMemo(() => {
    const awayLineup = lineups?.filter(l => l.team_id === awayTeam.id && l.is_starter)
    const firstPos = awayLineup?.find(l => l.position?.includes(':'))?.position
    return firstPos?.split(':')[0] || '2-1-1'
  }, [lineups, awayTeam.id])

  const currentFormation = activeTab === 'away' ? awayFormationDetected : homeFormationDetected
  const [now] = useState(() => Date.now())
  const matchTime = scheduledAt ? new Date(scheduledAt).getTime() : 0
  const isLocked = matchTime > 0 && (matchTime - now < 3600000)
  const canEdit = (isCaptain && activeTeam.captain_id === profile?.id) && !isLocked

  if (isLoading) return <div className="p-8 text-center text-text-muted">Chargement des compositions...</div>

  return (
    <div className="card p-0 overflow-hidden glass-morphism border border-surface-border shadow-2xl">
      {/* Tabs Équipes */}
      <div className="flex border-b border-surface-border bg-surface-muted/30 backdrop-blur-md">
        {[
          { ...homeTeam, tabId: 'home' as const },
          { id: 'both', name: 'Face à Face', color: '#C8F135', tabId: 'both' as const },
          { ...awayTeam, tabId: 'away' as const }
        ].map((team) => {
          const isBoth = team.tabId === 'both'
          const isActive = activeTab === team.tabId

          return (
            <button
              key={team.id}
              onClick={() => { setActiveTab(team.tabId); setIsEditing(false) }}
              className={clsx(
                "flex-1 relative flex items-center justify-center gap-3 py-5 text-[10px] font-black uppercase tracking-[0.15em] transition-all",
                isActive ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
              )}
            >
              {!isBoth && <div className="w-2.5 h-2.5 rounded shadow-lg" style={{ backgroundColor: (team as { color?: string }).color }} />}
              {team.name}
              {isActive && (
                <motion.div
                  layoutId="activeTabLineup"
                  className="absolute bottom-0 inset-x-0 h-0.5"
                  style={{ backgroundColor: (team as { color?: string }).color }}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-primary-500" />
              <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Composition</h3>
            </div>

            {!isEditing && activeTab !== 'both' && (
              <div className="flex p-1 bg-surface-muted/30 rounded-xl border border-surface-border">
                {['pitch', 'list'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as 'pitch' | 'list')}
                    className={clsx(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      viewMode === mode ? "bg-surface-muted text-text-primary shadow-lg" : "text-text-muted hover:text-text-secondary"
                    )}
                  >
                    {mode === 'pitch' ? 'Terrain' : 'Liste'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isLocked && (
              <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[9px] font-black uppercase tracking-widest text-red-400">
                Verrouillé
              </div>
            )}
            {canEdit && !isEditing && activeTab !== 'both' && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-500 transition-all shadow-lg"
              >
                <Edit3 size={14} />
                Modifier
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <LineupEditor
            matchId={matchId}
            teamId={activeTeam.id}
            onClose={() => setIsEditing(false)}
            initialStarters={teamLineup.filter(l => l.is_starter).map(l => l.player_id)}
            initialSubs={teamLineup.filter(l => !l.is_starter).map(l => l.player_id)}
            initialFormation={currentFormation}
            teamColor={activeTeam.color}
            suspendedPlayerIds={suspendedPlayerIds}
          />
        ) : activeTab === 'both' ? (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-center gap-12 text-center">
              <div className="flex flex-col items-center">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{homeTeam.name}</p>
                <p className="text-xl font-black text-text-primary">{homeFormationDetected}</p>
                <p className="text-[9px] text-text-muted/60 font-bold uppercase">{FORMATIONS[homeFormationDetected]?.style}</p>
              </div>
              <div className="w-px h-12 bg-surface-border" />
              <div className="flex flex-col items-center">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{awayTeam.name}</p>
                <p className="text-xl font-black text-text-primary">{awayFormationDetected}</p>
                <p className="text-[9px] text-text-muted/60 font-bold uppercase">{FORMATIONS[awayFormationDetected]?.style}</p>
              </div>
            </div>
            <FullMatchPitch
              homePlayers={lineups?.filter(l => l.team_id === homeTeam.id && l.is_starter) || []}
              awayPlayers={lineups?.filter(l => l.team_id === awayTeam.id && l.is_starter) || []}
              homeColor={homeTeam.color}
              awayColor={awayTeam.color}
              homeFormation={homeFormationDetected}
              awayFormation={awayFormationDetected}
              suspendedPlayerIds={suspendedPlayerIds}
            />
          </div>
        ) : (
          <div className="space-y-12 animate-fade-in">
            {/* Vue Combinée Terrain + Liste */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
              {/* Col Gauche : Terrain */}
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-4 text-center">
                  <div className="px-6 py-2 rounded-2xl bg-surface-muted/30 border border-surface-border shadow-xl">
                    <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest mb-1">Formation</p>
                    <p className="text-xl font-black text-text-primary">{currentFormation}</p>
                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{FORMATIONS[currentFormation]?.style}</p>
                  </div>
                </div>
                <PitchView
                  players={teamLineup.filter(l => l.is_starter)}
                  teamColor={activeTeam.color}
                  formation={currentFormation}
                  suspendedPlayerIds={suspendedPlayerIds}
                />
              </div>

              {/* Col Droite : Listes */}
              <div className="space-y-8">
                {/* Titulaires */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-xl bg-[#C8F135]/10 flex items-center justify-center">
                      <UserCheck size={16} className="text-[#C8F135]" />
                    </div>
                    <span className="text-xs font-black text-text-primary uppercase tracking-widest">Titulaires</span>
                  </div>
                  <div className="space-y-2">
                    {teamLineup.filter(l => l.is_starter).map(l => (
                      <PlayerRow
                        key={l.id}
                        lineup={l}
                        isStarter
                        isSuspended={suspendedPlayerIds.includes(l.player_id)}
                      />
                    ))}
                  </div>
                </section>

                {/* Remplaçants */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Shield size={16} className="text-blue-400" />
                    </div>
                    <span className="text-xs font-black text-text-primary uppercase tracking-widest">Banc</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {teamLineup.filter(l => !l.is_starter).map(l => (
                      <PlayerRow
                        key={l.id}
                        lineup={l}
                        isSuspended={suspendedPlayerIds.includes(l.player_id)}
                      />
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LineupEditor({ matchId, teamId, onClose, initialStarters, initialSubs, initialFormation, teamColor, suspendedPlayerIds = [] }: LineupEditorProps) {
  const { data: players } = usePlayersByTeam(teamId)
  const updateLineup = useUpdateMatchLineup()

  const [starters, setStarters] = useState<string[]>(initialStarters)
  const [subs, setSubs] = useState<string[]>(initialSubs)
  const [formation, setFormation] = useState(initialFormation)
  const [saveError, setSaveError] = useState<string | null>(null)

  const containsSuspended = starters.some(id => suspendedPlayerIds.includes(id))

  const handleTogglePlayer = (playerId: string) => {
    if (suspendedPlayerIds.includes(playerId)) {
      // Joueur suspendu : on peut uniquement le retirer s'il était déjà sélectionné
      if (starters.includes(playerId)) {
        setStarters(starters.filter(id => id !== playerId))
      } else if (subs.includes(playerId)) {
        setSubs(subs.filter(id => id !== playerId))
      }
      return
    }

    if (starters.includes(playerId)) {
      // Titulaire → banc
      setStarters(starters.filter(id => id !== playerId))
      setSubs([...subs, playerId])
    } else if (subs.includes(playerId)) {
      // Banc → retiré
      setSubs(subs.filter(id => id !== playerId))
    } else {
      // Non sélectionné → titulaire si places dispo, sinon banc
      if (starters.length < 5) setStarters([...starters, playerId])
      else setSubs([...subs, playerId])
    }
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaveError(null)
    try {
      const formationCoords = FORMATIONS[formation].coords
      const startersWithPositions = starters.map((pid, idx) => ({
        id: pid,
        pos: `${formation}:${formationCoords[idx]?.pos ?? 'P' + (idx + 1)}`
      }))

      await updateLineup.mutateAsync({
        matchId,
        teamId,
        starters: startersWithPositions,
        substitutes: subs,
      })
      onClose()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur lors de la sauvegarde'
      setSaveError(msg)
    }
  }

  // La composition est valide dès qu'il y a au moins 1 titulaire et aucun suspendu
  // parmi les titulaires. On n'impose plus strictement 5 (cas d'équipes incomplètes).
  const canSave = starters.length >= 1 && starters.length <= 5 && !containsSuspended

  // Message d'aide contextuel sous le compteur
  const starterHint =
    starters.length === 0 ? 'Sélectionne au moins 1 titulaire'
    : starters.length < 5 ? `${5 - starters.length} place${5 - starters.length > 1 ? 's' : ''} restante${5 - starters.length > 1 ? 's' : ''}`
    : null

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] px-2 flex items-center gap-2">
              <Layout size={12} className="text-primary-500" />
              Formation
            </label>
            <div className="grid grid-cols-4 gap-2">
              {Object.keys(FORMATIONS).map(key => (
                <button
                  key={key}
                  onClick={() => setFormation(key)}
                  className={clsx(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all",
                    formation === key
                      ? "bg-primary-600 border-primary-500 text-white shadow-lg"
                      : "bg-surface-muted/30 border-surface-border text-text-muted hover:border-primary-500/40"
                  )}
                >
                  <span className="text-xs font-black">{FORMATIONS[key].label}</span>
                </button>
              ))}
            </div>
          </div>
          <PitchView
            players={starters.map(id => ({ player_id: id, player: players?.find(p => p.id === id) })) as { player_id: string; player?: { id?: string; avatar_url?: string; jersey_number?: number } }[]}
            teamColor={teamColor}
            formation={formation}
            suspendedPlayerIds={suspendedPlayerIds}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Sélection</p>
            <div className="flex flex-col items-end gap-0.5">
              <span className={clsx(
                "text-[10px] font-black px-3 py-1 rounded-full border",
                starters.length === 5
                  ? "bg-primary-500/10 border-primary-500/30 text-primary-400"
                  : "bg-surface-muted/30 border-surface-border text-text-primary"
              )}>
                {starters.length}/5
              </span>
              {starterHint && (
                <span className="text-[9px] text-text-muted font-bold">{starterHint}</span>
              )}
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
            {players?.map(p => {
              const isSuspended = suspendedPlayerIds.includes(p.id)
              const isStarter = starters.includes(p.id)
              const isSub = subs.includes(p.id)

              return (
                <button
                  key={p.id}
                  onClick={() => handleTogglePlayer(p.id)}
                  disabled={isSuspended && !isStarter && !isSub}
                  className={clsx(
                    "w-full flex items-center gap-4 p-3 rounded-2xl border transition-all text-left",
                    isSuspended
                      ? "bg-red-500/5 border-red-500/10 opacity-40 cursor-not-allowed"
                      : isStarter
                        ? "bg-primary-500/10 border-primary-500/30"
                        : isSub
                          ? "bg-blue-500/10 border-blue-500/30"
                          : "bg-surface-muted/10 border-surface-border opacity-60 hover:opacity-100"
                  )}
                >
                  <div className={clsx(
                    "w-10 h-10 rounded-xl bg-surface-card/60 flex items-center justify-center text-sm font-black text-text-primary border border-surface-border transition-colors",
                    isSuspended && "border-red-500/30"
                  )}>
                    {p.jersey_number ?? '—'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={clsx("font-bold truncate transition-colors", isSuspended ? "text-red-400/80" : "text-text-primary")}>
                        {p.first_name} {p.last_name}
                      </p>
                      {isSuspended && (
                        <span className="px-1.5 py-0.5 rounded-md bg-red-500 text-white text-[8px] font-black uppercase tracking-tighter shrink-0 animate-pulse">
                          Suspendu
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-text-muted/60 font-bold uppercase">{p.position}</p>
                  </div>
                  {/* Badge de statut à droite */}
                  {isStarter && (
                    <span className="shrink-0 text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-primary-500/20 text-primary-400 border border-primary-500/30">
                      Titulaire
                    </span>
                  )}
                  {isSub && (
                    <span className="shrink-0 text-[8px] font-black uppercase px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      Banc
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Avertissement suspendu parmi titulaires */}
      {containsSuspended && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-[10px] font-black uppercase tracking-widest leading-relaxed animate-pulse">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span>Un titulaire est suspendu. Retirez-le avant de valider.</span>
        </div>
      )}

      {/* Erreur de sauvegarde */}
      {saveError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest">
          ❌ {saveError}
        </div>
      )}

      <div className="flex gap-3 pt-6 border-t border-surface-border">
        <button
          onClick={handleSave}
          disabled={!canSave || updateLineup.isPending}
          className={clsx(
            "flex-1 py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] transition-all",
            canSave && !updateLineup.isPending
              ? "bg-primary-600 text-white shadow-xl hover:bg-primary-500 active:scale-[0.98]"
              : "bg-surface-muted text-text-muted cursor-not-allowed"
          )}
        >
          {updateLineup.isPending
            ? "Transmission..."
            : starters.length === 0
              ? "Sélectionne des joueurs"
              : "Valider la composition"
          }
        </button>
        <button
          onClick={onClose}
          className="px-8 py-4 rounded-2xl bg-surface-muted/30 border border-surface-border text-text-primary font-black uppercase tracking-widest hover:bg-surface-muted transition-colors"
        >
          Annuler
        </button>
      </div>
    </div>
  )
}

function PlayerRow({ lineup, isSuspended }: { lineup: MatchLineup, isStarter?: boolean, isSuspended?: boolean }) {
  return (
    <div className={clsx(
      "group flex items-center gap-4 p-3 rounded-2xl bg-surface-muted/10 border border-surface-border/50 transition-all cursor-default",
      isSuspended ? "opacity-50 grayscale-[0.5] border-red-500/20" : "hover:bg-surface-muted/20"
    )}>
      {/* Avatar ou numéro */}
      <div className={clsx(
        "w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center text-sm font-black text-text-primary border border-surface-border group-hover:border-primary-500/50 transition-colors shrink-0",
        isSuspended && "border-red-500/40"
      )}>
        {lineup.player?.avatar_url
          ? <img src={lineup.player.avatar_url} alt="" className="w-full h-full object-cover" />
          : <span className="bg-surface-card/60 w-full h-full flex items-center justify-center">
              {lineup.player?.jersey_number ?? '—'}
            </span>
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-text-primary truncate group-hover:text-primary-400 transition-colors">
            {lineup.player?.first_name} {lineup.player?.last_name}
          </p>
          {isSuspended && (
            <span className="px-1.5 py-0.5 rounded-md bg-red-500 text-white text-[8px] font-black uppercase tracking-tighter">
              Suspendu
            </span>
          )}
        </div>
        <p className="text-[10px] text-text-muted/60 font-bold uppercase tracking-wider">
          {lineup.player?.jersey_number ? `#${lineup.player.jersey_number} · ` : ''}{lineup.player?.position || '—'}
        </p>
      </div>
    </div>
  )
}

export function PitchView({ players, teamColor, formation, suspendedPlayerIds = [] }: any) {
  const coords = FORMATIONS[formation]?.coords || FORMATIONS['2-1-1'].coords
  return (
    <div className="relative aspect-[16/10] w-full max-w-2xl mx-auto bg-[#1a4d2e] rounded-3xl overflow-hidden border-2 border-surface-border shadow-2xl">
      {/* Texture & Lignes Landscape */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#2d6a4f_0%,#1b4332_100%)] opacity-40" />
      <div className="absolute inset-6 border-2 border-white/20 rounded-sm">
        {/* Surface de réparation à gauche pour la vue d'une seule équipe */}
        <div className="absolute inset-y-1/4 left-0 w-24 border-2 border-l-0 border-white/10" />
        <div className="absolute top-1/2 left-0 w-32 h-32 border-2 border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2" />
      </div>

      <AnimatePresence>
        {players.map((l, idx: number) => {
          const coord = coords[idx] || { x: 50, y: 50 }
          const isSuspended = suspendedPlayerIds.includes(l.player_id)

          // Paysage : GK à gauche (X proche de 0), ST à droite (X proche de 100)
          const posX = 100 - coord.y // GK (85) -> 15%, ST (20) -> 80%
          const posY = coord.x

          return (
            <motion.div
              key={l.player_id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, left: `${posX}%`, top: `${posY}%` }}
              className={clsx(
                "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 z-10 transition-opacity duration-300",
                isSuspended && "opacity-60"
              )}
            >
              <div
                className={clsx(
                  "relative w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white shadow-2xl overflow-hidden flex items-center justify-center text-white font-black text-xs sm:text-sm transition-all",
                  isSuspended && "border-red-500 scale-90"
                )}
                style={{ backgroundColor: isSuspended ? '#ef4444' : teamColor }}
              >
                {isSuspended
                  ? <UserX size={16} />
                  : l.player?.avatar_url
                    ? <img src={l.player.avatar_url} alt="" className="w-full h-full object-cover" />
                    : (l.player?.jersey_number || (idx + 1))
                }
                {isSuspended && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 border border-white flex items-center justify-center shadow-lg animate-pulse">
                    <ShieldAlert size={8} />
                  </div>
                )}
              </div>
              <div className={clsx(
                "px-3 py-1 rounded-full border shadow-xl backdrop-blur-md",
                isSuspended ? "bg-red-500/25 border-red-500/30" : "bg-slate-950/75 border-white/10"
              )}>
                <p className={clsx(
                  "text-[8px] sm:text-[10px] font-black uppercase tracking-tight whitespace-nowrap",
                  isSuspended ? "text-red-400" : "text-slate-100"
                )}>
                  {l.player?.last_name}
                </p>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

export function FullMatchPitch({ homePlayers, awayPlayers, homeColor, awayColor, homeFormation, awayFormation, suspendedPlayerIds = [] }: FullMatchPitchProps) {
  return (
    <div className="relative aspect-[16/10] w-full max-w-4xl mx-auto bg-[#1a4d2e] rounded-3xl overflow-hidden border-2 border-surface-border shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      {/* Texture & Lignes Landscape */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#2d6a4f_0%,#1b4332_100%)] opacity-40" />
      <div className="absolute inset-6 border-2 border-white/20 rounded-sm">
        {/* Ligne médiane verticale */}
        <div className="absolute left-1/2 inset-y-0 w-0.5 bg-white/20 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 w-32 h-32 border-2 border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2" />

        {/* Surfaces de réparation Gauche / Droite */}
        <div className="absolute inset-y-1/4 left-0 w-24 border-2 border-l-0 border-white/10" />
        <div className="absolute inset-y-1/4 right-0 w-24 border-2 border-r-0 border-white/10" />
      </div>

      <div className="absolute inset-0 flex">
        {/* Home Team (Left) */}
        <div className="flex-1 relative">
          <PitchPart players={homePlayers} teamColor={homeColor} formation={homeFormation} side="left" suspendedPlayerIds={suspendedPlayerIds} />
        </div>
        {/* Away Team (Right) */}
        <div className="flex-1 relative">
          <PitchPart players={awayPlayers} teamColor={awayColor} formation={awayFormation} side="right" suspendedPlayerIds={suspendedPlayerIds} />
        </div>
      </div>
    </div>
  )
}

function PitchPart({ players, teamColor, formation, side, suspendedPlayerIds = [] }: PitchPartProps) {
  const coords = FORMATIONS[formation]?.coords || FORMATIONS['2-1-1'].coords
  const isLeft = side === 'left'

  return (
    <>
      {players.map((l, idx: number) => {
        const coord = coords[idx] || { x: 50, y: 50 }
        const isSuspended = suspendedPlayerIds.includes(l.player_id)

        let posX, posY
        if (isLeft) {
          posX = 100 - coord.y // GK (85) -> 15%, ST (20) -> 80%
          posY = coord.x
        } else {
          posX = coord.y // GK (85) -> 85%, ST (20) -> 20%
          posY = coord.x
        }

        return (
          <motion.div
            key={l.player_id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, left: `${posX}%`, top: `${posY}%` }}
            className={clsx(
              "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10",
              isSuspended && "opacity-60"
            )}
          >
            <div
              className={clsx(
                "relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white shadow-xl overflow-hidden flex items-center justify-center text-white font-black text-[10px] sm:text-xs",
                isSuspended && "border-red-500 scale-90"
              )}
              style={{ backgroundColor: isSuspended ? '#ef4444' : teamColor }}
            >
              {isSuspended
                ? <UserX size={12} />
                : l.player?.avatar_url
                  ? <img src={l.player.avatar_url} alt="" className="w-full h-full object-cover" />
                  : (l.player?.jersey_number || (idx + 1))
              }
            </div>
            <div className={clsx(
              "px-2 py-0.5 rounded-full border shadow-lg backdrop-blur-md",
              isSuspended ? "bg-red-500/25 border-red-500/30" : "bg-slate-950/75 border-white/10"
            )}>
              <p className={clsx(
                "text-[7px] sm:text-[8px] font-black uppercase tracking-tighter whitespace-nowrap",
                isSuspended ? "text-red-400" : "text-slate-100"
              )}>
                {l.player?.last_name}
              </p>
            </div>
          </motion.div>
        )
      })}
    </>
  )
}
