import { useState, useMemo, useEffect, useCallback } from 'react'
import { Users, UserCheck, Shield, Edit3, Save, Layout, Calendar } from 'lucide-react'
import { useMatchLineups, useUpdateMatchLineup } from '@/hooks/useLineups'
import { usePlayersByTeam } from '@/hooks/usePlayers'
import { useAuth } from '@/hooks/useAuth'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useRealtimeMatchTactics } from '@/hooks/useRealtime'

import type { TeamRef } from '@/types/database'

interface MatchLineupsProps {
  matchId: string
  homeTeam: TeamRef
  awayTeam: TeamRef
  scheduledAt?: string | null
  homeFormation?: string
  awayFormation?: string
}

export const FORMATIONS: Record<string, { label: string, style: string, coords: { x: number, y: number, pos: string }[] }> = {
  '2-1-1': {
    label: '2-1-1', style: 'Équilibré',
    coords: [
      { x: 50, y: 85, pos: 'GK' }, { x: 30, y: 65, pos: 'LD' }, { x: 70, y: 65, pos: 'RD' }, { x: 50, y: 45, pos: 'CM' }, { x: 50, y: 20, pos: 'ST' }
    ]
  },
  '1-2-1': {
    label: '1-2-1', style: 'Possession',
    coords: [
      { x: 50, y: 85, pos: 'GK' }, { x: 50, y: 65, pos: 'CD' }, { x: 30, y: 45, pos: 'LM' }, { x: 70, y: 45, pos: 'RM' }, { x: 50, y: 20, pos: 'ST' }
    ]
  },
  '2-2': {
    label: '2-2', style: 'Rapide',
    coords: [
      { x: 50, y: 85, pos: 'GK' }, { x: 30, y: 65, pos: 'LD' }, { x: 70, y: 65, pos: 'RD' }, { x: 30, y: 30, pos: 'LF' }, { x: 70, y: 30, pos: 'RF' }
    ]
  },
  '1-1-2': {
    label: '1-1-2', style: 'Offensif',
    coords: [
      { x: 50, y: 85, pos: 'GK' }, { x: 50, y: 70, pos: 'CD' }, { x: 50, y: 45, pos: 'CM' }, { x: 30, y: 25, pos: 'LF' }, { x: 70, y: 25, pos: 'RF' }
    ]
  },
  '0-2-2': {
    label: '0-2-2', style: 'Ultra Attaque',
    coords: [
      { x: 50, y: 85, pos: 'GK' }, { x: 30, y: 55, pos: 'LM' }, { x: 70, y: 55, pos: 'RM' }, { x: 30, y: 25, pos: 'LF' }, { x: 70, y: 25, pos: 'RF' }
    ]
  },
  '1-3': {
    label: '1-3', style: 'Tout Attaque',
    coords: [
      { x: 50, y: 85, pos: 'GK' }, { x: 50, y: 70, pos: 'CD' }, { x: 20, y: 35, pos: 'LF' }, { x: 50, y: 25, pos: 'CF' }, { x: 80, y: 35, pos: 'RF' }
    ]
  },
  '3-1': {
    label: '3-1', style: 'Défensif',
    coords: [
      { x: 50, y: 85, pos: 'GK' }, { x: 20, y: 65, pos: 'LD' }, { x: 50, y: 70, pos: 'CD' }, { x: 80, y: 65, pos: 'RD' }, { x: 50, y: 30, pos: 'ST' }
    ]
  },
  'Rotation': {
    label: 'Rotation', style: 'Futsal',
    coords: [
      { x: 50, y: 85, pos: 'GK' }, { x: 25, y: 60, pos: 'P1' }, { x: 75, y: 60, pos: 'P2' }, { x: 25, y: 35, pos: 'P3' }, { x: 75, y: 35, pos: 'P4' }
    ]
  }
}

export function MatchLineups({ matchId, homeTeam, awayTeam, scheduledAt, homeFormation, awayFormation }: MatchLineupsProps) {
  const { isAdmin, isCaptain, profile } = useAuth()
  
  // Initialiser sur l'équipe du capitaine s'il fait partie du match
  const defaultTab = useMemo(() => {
    if (isCaptain) {
      if (homeTeam.captain_id === profile?.id) return 'home'
      if (awayTeam.captain_id === profile?.id) return 'away'
    }
    return 'both'
  }, [isCaptain, homeTeam.captain_id, awayTeam.captain_id, profile?.id])

  const [activeTab, setActiveTab] = useState<'home' | 'away' | 'both'>(defaultTab)
  const { data: lineups, isLoading } = useMatchLineups(matchId)
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

  const matchTime = scheduledAt ? new Date(scheduledAt).getTime() : 0
  const isLocked = matchTime > 0 && (matchTime - Date.now() < 3600000)
  const canEdit = (isCaptain && activeTeam.captain_id === profile?.id) && !isLocked

  if (isLoading) return <div className="p-8 text-center text-slate-500">Chargement des compositions...</div>

  return (
    <div className="card p-0 overflow-hidden glass-morphism border border-white/10 shadow-2xl">
      {/* Tabs Équipes */}
      <div className="flex border-b border-white/5 bg-black/40 backdrop-blur-md">
        {[
          { ...homeTeam, tabId: 'home' as const },
          { id: 'both', name: 'Face à Face', color: '#C8F135', tabId: 'both' as const },
          { ...awayTeam, tabId: 'away' as const }
        ].map((team, idx) => {
          const isBoth = team.tabId === 'both'
          const isActive = activeTab === team.tabId

          return (
            <button
              key={team.id}
              onClick={() => { setActiveTab(team.tabId); setIsEditing(false) }}
              className={clsx(
                "flex-1 relative flex items-center justify-center gap-3 py-5 text-[10px] font-black uppercase tracking-[0.15em] transition-all",
                isActive ? "text-white" : "text-slate-500 hover:text-slate-300"
              )}
            >
              {!isBoth && <div className="w-2.5 h-2.5 rounded shadow-lg" style={{ backgroundColor: (team as any).color }} />}
              {team.name}
              {isActive && (
                <motion.div
                  layoutId="activeTabLineup"
                  className="absolute bottom-0 inset-x-0 h-0.5"
                  style={{ backgroundColor: (team as any).color }}
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
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Composition</h3>
            </div>

            {!isEditing && activeTab !== 'both' && (
              <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                {['pitch', 'list'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as any)}
                    className={clsx(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      viewMode === mode ? "bg-white/10 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
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
          />
        ) : activeTab === 'both' ? (
          <div className="space-y-8 animate-fade-in">
            <div className="flex items-center justify-center gap-12 text-center">
              <div className="flex flex-col items-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{homeTeam.name}</p>
                <p className="text-xl font-black text-white">{homeFormationDetected}</p>
                <p className="text-[9px] text-slate-600 font-bold uppercase">{FORMATIONS[homeFormationDetected]?.style}</p>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="flex flex-col items-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{awayTeam.name}</p>
                <p className="text-xl font-black text-white">{awayFormationDetected}</p>
                <p className="text-[9px] text-slate-600 font-bold uppercase">{FORMATIONS[awayFormationDetected]?.style}</p>
              </div>
            </div>
            <FullMatchPitch
              homePlayers={lineups?.filter(l => l.team_id === homeTeam.id && l.is_starter) || []}
              awayPlayers={lineups?.filter(l => l.team_id === awayTeam.id && l.is_starter) || []}
              homeColor={homeTeam.color}
              awayColor={awayTeam.color}
              homeFormation={homeFormationDetected}
              awayFormation={awayFormationDetected}
            />
          </div>
        ) : (
          <div className="space-y-12 animate-fade-in">
            {/* Vue Combinée Terrain + Liste */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
              {/* Col Gauche : Terrain */}
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-4 text-center">
                  <div className="px-6 py-2 rounded-2xl bg-white/5 border border-white/10 shadow-xl">
                    <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest mb-1">Formation</p>
                    <p className="text-xl font-black text-white">{currentFormation}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{FORMATIONS[currentFormation]?.style}</p>
                  </div>
                </div>
                <PitchView
                  players={teamLineup.filter(l => l.is_starter)}
                  teamColor={activeTeam.color}
                  formation={currentFormation}
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
                    <span className="text-xs font-black text-white uppercase tracking-widest">Titulaires</span>
                  </div>
                  <div className="space-y-2">
                    {teamLineup.filter(l => l.is_starter).map(l => (
                      <PlayerRow key={l.id} lineup={l} isStarter />
                    ))}
                  </div>
                </section>

                {/* Remplaçants */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Shield size={16} className="text-blue-400" />
                    </div>
                    <span className="text-xs font-black text-white uppercase tracking-widest">Banc</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {teamLineup.filter(l => !l.is_starter).map(l => (
                      <PlayerRow key={l.id} lineup={l} />
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

function LineupEditor({ matchId, teamId, onClose, initialStarters, initialSubs, initialFormation, teamColor }: any) {
  const { data: players } = usePlayersByTeam(teamId)
  const updateLineup = useUpdateMatchLineup()

  const [starters, setStarters] = useState<string[]>(initialStarters)
  const [subs, setSubs] = useState<string[]>(initialSubs)
  const [formation, setFormation] = useState(initialFormation)

  const handleTogglePlayer = (playerId: string) => {
    if (starters.includes(playerId)) {
      setStarters(starters.filter(id => id !== playerId))
      setSubs([...subs, playerId])
    } else if (subs.includes(playerId)) {
      setSubs(subs.filter(id => id !== playerId))
    } else {
      if (starters.length >= 5) setSubs([...subs, playerId])
      else setStarters([...starters, playerId])
    }
  }

  const handleSave = async () => {
    const formationCoords = FORMATIONS[formation].coords
    const startersWithPositions = starters.map((pid, idx) => ({
      id: pid,
      pos: `${formation}:${formationCoords[idx].pos}`
    }))

    await updateLineup.mutateAsync({
      matchId,
      teamId,
      starters: startersWithPositions,
      substitutes: subs
    })
    onClose()
  }

  const canSave = starters.length === 5

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
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
                    formation === key ? "bg-primary-600 border-primary-500 text-white shadow-lg" : "bg-white/5 border-white/5 text-slate-500"
                  )}
                >
                  <span className="text-xs font-black">{FORMATIONS[key].label}</span>
                </button>
              ))}
            </div>
          </div>
          <PitchView
            players={starters.map(id => ({ player_id: id, player: players?.find(p => p.id === id) })) as any}
            teamColor={teamColor}
            formation={formation}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sélection</p>
            <span className="text-[10px] font-black text-white bg-black/40 px-3 py-1 rounded-full border border-white/5">{starters.length}/5</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
            {players?.map(p => (
              <button
                key={p.id}
                onClick={() => handleTogglePlayer(p.id)}
                className={clsx(
                  "w-full flex items-center gap-4 p-3 rounded-2xl border transition-all text-left",
                  starters.includes(p.id) ? "bg-primary-500/10 border-primary-500/30" :
                    subs.includes(p.id) ? "bg-blue-500/10 border-blue-500/30" : "bg-white/2 border-white/5 opacity-60"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-black/60 flex items-center justify-center text-sm font-black text-white border border-white/10">
                  {p.jersey_number ?? '—'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{p.first_name} {p.last_name}</p>
                  <p className="text-[10px] text-slate-600 font-bold uppercase">{p.position}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-6 border-t border-white/5">
        <button
          onClick={handleSave}
          disabled={!canSave || updateLineup.isPending}
          className={clsx("flex-1 py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] transition-all", canSave ? "bg-primary-600 text-white shadow-xl" : "bg-slate-800 text-slate-500")}
        >
          {updateLineup.isPending ? "Transmission..." : "Valider"}
        </button>
        <button onClick={onClose} className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest">Annuler</button>
      </div>
    </div>
  )
}

function PlayerRow({ lineup, isStarter }: { lineup: any, isStarter?: boolean }) {
  return (
    <div className="group flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-default">
      <div className="w-10 h-10 rounded-xl bg-black/60 flex items-center justify-center text-sm font-black text-white border border-white/10 group-hover:border-primary-500/50 transition-colors">
        {lineup.player?.jersey_number ?? '—'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-white truncate group-hover:text-primary-400 transition-colors">{lineup.player?.first_name} {lineup.player?.last_name}</p>
        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">{lineup.player?.position || '—'}</p>
      </div>
    </div>
  )
}

export function PitchView({ players, teamColor, formation }: any) {
  const coords = FORMATIONS[formation]?.coords || FORMATIONS['2-1-1'].coords
  return (
    <div className="relative aspect-[16/10] w-full max-w-2xl mx-auto bg-[#1a4d2e] rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl">
      {/* Texture & Lignes Landscape */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#2d6a4f_0%,#1b4332_100%)] opacity-40" />
      <div className="absolute inset-6 border-2 border-white/20 rounded-sm">
        {/* Surface de réparation à gauche pour la vue d'une seule équipe */}
        <div className="absolute inset-y-1/4 left-0 w-24 border-2 border-l-0 border-white/10" />
        <div className="absolute top-1/2 left-0 w-32 h-32 border-2 border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2" />
      </div>

      <AnimatePresence>
        {players.map((l: any, idx: number) => {
          const coord = coords[idx] || { x: 50, y: 50 }
          
          // Paysage : GK à gauche (X proche de 0), ST à droite (X proche de 100)
          const posX = 100 - coord.y // GK (85) -> 15%, ST (20) -> 80%
          const posY = coord.x

          return (
            <motion.div
              key={l.player_id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, left: `${posX}%`, top: `${posY}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 z-10"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-white shadow-2xl flex items-center justify-center text-white font-black text-xs sm:text-sm" style={{ backgroundColor: teamColor }}>
                {l.player?.jersey_number || (idx + 1)}
              </div>
              <div className="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 shadow-xl">
                <p className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-tight whitespace-nowrap">
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

export function FullMatchPitch({ homePlayers, awayPlayers, homeColor, awayColor, homeFormation, awayFormation }: any) {
  return (
    <div className="relative aspect-[16/10] w-full max-w-4xl mx-auto bg-[#1a4d2e] rounded-3xl overflow-hidden border-2 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
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
          <PitchPart players={homePlayers} teamColor={homeColor} formation={homeFormation} side="left" />
        </div>
        {/* Away Team (Right) */}
        <div className="flex-1 relative">
          <PitchPart players={awayPlayers} teamColor={awayColor} formation={awayFormation} side="right" />
        </div>
      </div>
    </div>
  )
}

function PitchPart({ players, teamColor, formation, side }: any) {
  const coords = FORMATIONS[formation]?.coords || FORMATIONS['2-1-1'].coords
  const isLeft = side === 'left'

  return (
    <>
      {players.map((l: any, idx: number) => {
        const coord = coords[idx] || { x: 50, y: 50 }

        // En paysage : 
        // X (profondeur) devient la coordonnée horizontale
        // Y (largeur) devient la coordonnée verticale

        // Portrait coord.y: 20 (ST) à 85 (GK)
        // Gauche (Home) : GK à gauche (X proche de 0), ST vers le centre (X proche de 100)
        // Droite (Away) : GK à droite (X proche de 100), ST vers le centre (X proche de 0)

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
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10"
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white font-black text-[10px] sm:text-xs" style={{ backgroundColor: teamColor }}>
              {l.player?.jersey_number || (idx + 1)}
            </div>
            <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 shadow-lg">
              <p className="text-[7px] sm:text-[8px] font-black text-white uppercase tracking-tighter whitespace-nowrap">{l.player?.last_name}</p>
            </div>
          </motion.div>
        )
      })}
    </>
  )
}
