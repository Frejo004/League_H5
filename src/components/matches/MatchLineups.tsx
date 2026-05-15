import { useState, useMemo } from 'react'
import { Users, UserCheck, Shield, ChevronRight, Edit3, Save, X, Layout } from 'lucide-react'
import { useMatchLineups, useUpdateMatchLineup } from '@/hooks/useLineups'
import { usePlayersByTeam } from '@/hooks/usePlayers'
import { useAuth } from '@/hooks/useAuth'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'

import type { TeamRef } from '@/types/database'

interface MatchLineupsProps {
  matchId: string
  homeTeam: TeamRef
  awayTeam: TeamRef
  scheduledAt?: string | null
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

export function MatchLineups({ matchId, homeTeam, awayTeam, scheduledAt }: MatchLineupsProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'away'>('home')
  const { data: lineups, isLoading } = useMatchLineups(matchId)
  const { isAdmin, isCaptain, profile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'pitch'>('pitch')

  const activeTeam = activeTab === 'home' ? homeTeam : awayTeam
  const teamLineup = lineups?.filter(l => l.team_id === activeTeam.id) ?? []
  
  // Déduire la formation actuelle basée sur les positions enregistrées (ou défaut)
  const currentFormation = useMemo(() => {
    const firstPos = teamLineup.find(l => l.is_starter && l.position?.includes(':'))?.position
    return firstPos?.split(':')[0] || '2-1-1'
  }, [teamLineup])

  // Vérifier si l'utilisateur peut modifier
  // Deadline: 1h avant le match
  const matchTime = scheduledAt ? new Date(scheduledAt).getTime() : 0
  const isLocked = matchTime > 0 && (matchTime - Date.now() < 3600000)
  const canEdit = (isAdmin || (isCaptain && activeTeam.captain_id === profile?.id)) && !isLocked

  if (isLoading) return <div className="p-8 text-center text-slate-500">Chargement des compositions...</div>

  return (
    <div className="card p-0 overflow-hidden glass-morphism border border-white/10 shadow-2xl">
      {/* Tabs Équipes */}
      <div className="flex border-b border-white/5 bg-black/40 backdrop-blur-md">
        {[homeTeam, awayTeam].map((team, idx) => {
          const isHome = idx === 0
          const isActive = (isHome && activeTab === 'home') || (!isHome && activeTab === 'away')
          return (
            <button
              key={team.id}
              onClick={() => { setActiveTab(isHome ? 'home' : 'away'); setIsEditing(false) }}
              className={clsx(
                "flex-1 relative flex items-center justify-center gap-3 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                isActive ? "text-white" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <div className="w-3 h-3 rounded shadow-lg" style={{ backgroundColor: team.color }} />
              {team.name}
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 inset-x-0 h-0.5 bg-current" 
                  style={{ backgroundColor: team.color }} 
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
            
            {/* View Mode Toggle */}
            {!isEditing && (
              <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                {[
                  { id: 'pitch', label: 'Terrain' },
                  { id: 'list', label: 'Liste' }
                ].map(mode => (
                  <button 
                    key={mode.id}
                    onClick={() => setViewMode(mode.id as any)}
                    className={clsx(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      viewMode === mode.id ? "bg-white/10 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {isLocked && (
              <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[9px] font-black uppercase tracking-widest text-red-400">
                Verrouillé (Match à moins de 1h)
              </div>
            )}
            {canEdit && !isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary-500 transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0"
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
        ) : (
          <div className="space-y-10">
            {/* Terrain ou Liste */}
            {viewMode === 'pitch' ? (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-4 text-center">
                  <div className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
                    <p className="text-[10px] font-black text-primary-500 uppercase tracking-widest mb-1">Formation</p>
                    <p className="text-lg font-black text-white">{currentFormation}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{FORMATIONS[currentFormation]?.style}</p>
                  </div>
                </div>
                <PitchView 
                  players={teamLineup.filter(l => l.is_starter)} 
                  teamColor={activeTeam.color} 
                  formation={currentFormation}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Titulaires */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#C8F135]/10 flex items-center justify-center">
                         <UserCheck size={16} className="text-[#C8F135]" />
                      </div>
                      <span className="text-xs font-black text-white uppercase tracking-widest">Le 5 Majeur</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {teamLineup.filter(l => l.is_starter).length > 0 ? (
                      teamLineup.filter(l => l.is_starter).map(l => (
                        <PlayerRow key={l.id} lineup={l} isStarter />
                      ))
                    ) : (
                      <div className="py-10 text-center rounded-3xl border border-white/5 bg-white/2 bg-grid-pattern">
                        <p className="text-xs text-slate-600 font-bold italic uppercase tracking-widest">Aucune composition</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Remplaçants */}
                <section className="space-y-4">
                  <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                       <Shield size={16} className="text-blue-400" />
                    </div>
                    <span className="text-xs font-black text-white uppercase tracking-widest">Remplaçants</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {teamLineup.filter(l => !l.is_starter).map(l => (
                      <PlayerRow key={l.id} lineup={l} />
                    ))}
                  </div>
                </section>
              </div>
            )}
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
      if (starters.length >= 5) {
        setSubs([...subs, playerId])
      } else {
        setStarters([...starters, playerId])
      }
    }
  }

  const handleSave = async () => {
    // Assigner les positions basées sur la formation pour les titulaires
    const formationCoords = FORMATIONS[formation].coords
    const startersWithPositions = starters.map((pid, idx) => ({
      id: pid,
      pos: `${formation}:${formationCoords[idx].pos}`
    }))

    await updateLineup.mutateAsync({
      matchId,
      teamId,
      starters: startersWithPositions as any, // On adapte le type attendu
      substitutes: subs
    })
    onClose()
  }

  const canSave = starters.length === 5

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Colonne Gauche: Choix Formation & Aperçu */}
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
              <Layout size={12} className="text-primary-500" />
              Choisir la Formation
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.keys(FORMATIONS).map(key => (
                <button
                  key={key}
                  onClick={() => setFormation(key)}
                  className={clsx(
                    "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all",
                    formation === key 
                      ? "bg-primary-600 border-primary-500 text-white shadow-lg" 
                      : "bg-white/5 border-white/5 text-slate-500 hover:bg-white/10"
                  )}
                >
                  <span className="text-xs font-black">{FORMATIONS[key].label}</span>
                  <span className="text-[8px] font-bold uppercase opacity-60 truncate w-full text-center">{FORMATIONS[key].style}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">
              Aperçu Tactique
            </label>
            <PitchView 
              players={starters.map(id => ({ player_id: id, player: players?.find(p => p.id === id) })) as any} 
              teamColor={teamColor} 
              formation={formation}
            />
          </div>
        </div>

        {/* Colonne Droite: Sélection Joueurs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Sélection du "5 Majeur"
            </p>
            <span className={clsx(
              "text-[10px] font-black uppercase px-3 py-1 rounded-full",
              starters.length === 5 ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
            )}>
              {starters.length} / 5 titulaires
            </span>
          </div>

          <div className="max-h-[500px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {(players ?? [])
              .sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99))
              .map(player => {
                const isStarter = starters.includes(player.id)
                const isSub = subs.includes(player.id)
                const isSelected = isStarter || isSub

                return (
                  <button
                    key={player.id}
                    onClick={() => handleTogglePlayer(player.id)}
                    className={clsx(
                      "group w-full flex items-center gap-4 p-3 rounded-2xl border transition-all text-left",
                      isStarter ? "bg-[#C8F135]/10 border-[#C8F135]/30 shadow-lg" : 
                      isSub ? "bg-blue-500/10 border-blue-500/30 shadow-md" : 
                      "bg-white/2 border-white/5 opacity-60 hover:opacity-100 hover:bg-white/5"
                    )}
                  >
                    <div className={clsx(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-all",
                      isSelected ? "bg-black/60 text-white" : "bg-white/5 text-slate-600"
                    )}>
                      {player.jersey_number ?? '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={clsx("font-bold truncate transition-colors", isSelected ? "text-white" : "text-slate-500")}>
                        {player.first_name} {player.last_name}
                      </p>
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                        {player.position || 'Non défini'}
                      </p>
                    </div>
                    <div className={clsx(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      isStarter ? "bg-[#C8F135] text-black shadow-lg" : 
                      isSub ? "bg-blue-500 text-white" : 
                      "bg-white/5 text-slate-600"
                    )}>
                      {isStarter ? 'Starter' : isSub ? 'Banc' : 'SÉLECT.'}
                    </div>
                  </button>
                )
              })}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/5">
        <button 
          onClick={handleSave}
          disabled={updateLineup.isPending || !canSave}
          className={clsx(
            "flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] transition-all shadow-xl",
            canSave 
              ? "bg-primary-600 text-white hover:bg-primary-500 hover:-translate-y-1 active:translate-y-0" 
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          )}
        >
          {updateLineup.isPending ? "Transmission..." : <Save size={18} />}
          {canSave ? 'Valider la Composition' : '5 Titulaires Requis'}
        </button>
        <button 
          onClick={onClose} 
          className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest hover:bg-white/10 transition-all"
        >
          Annuler
        </button>
      </div>

      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
        <p className="text-[10px] text-amber-500/80 italic text-center leading-relaxed">
          * Les changements sont de style basketball (illimités). <br/>
          La composition est verrouillée 1h avant le coup d'envoi.
        </p>
      </div>
    </div>
  )
}

function PlayerRow({ lineup, isStarter }: { lineup: any, isStarter?: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="group flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-default"
    >
      <div className="w-10 h-10 rounded-xl bg-black/60 flex items-center justify-center text-sm font-black text-white border border-white/10 group-hover:border-primary-500/50 transition-colors">
        {lineup.player?.jersey_number ?? '—'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-white truncate group-hover:text-primary-400 transition-colors">
            {lineup.player?.first_name} {lineup.player?.last_name}
          </p>
          {isStarter && <div className="w-1.5 h-1.5 rounded-full bg-[#C8F135] animate-pulse" />}
        </div>
        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
          {lineup.player?.position || 'Joueur'}
        </p>
      </div>
    </motion.div>
  )
}

export function PitchView({ players, teamColor, formation, className }: { players: any[], teamColor: string, formation: string, className?: string }) {
  const coords = FORMATIONS[formation]?.coords || FORMATIONS['2-1-1'].coords

  return (
    <div className={clsx("relative w-full rounded-3xl overflow-hidden bg-pitch-600 border border-white/10 shadow-2xl", className || "aspect-square")}>
      {/* Texture herbe premium */}
      <div className="absolute inset-0 opacity-40 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
      <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-black/40" />
      
      {/* Lignes du terrain sportives */}
      <div className="absolute inset-6 border-2 border-white/30 rounded-lg pointer-events-none" />
      <div className="absolute inset-x-6 top-1/2 h-0.5 bg-white/30 -translate-y-1/2 pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 w-24 h-24 border-2 border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-32 h-16 border-2 border-white/30 border-t-0 rounded-b-xl" />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-32 h-16 border-2 border-white/30 border-b-0 rounded-t-xl" />
      
      {/* Placement des joueurs avec Framer Motion pour les transitions de formation */}
      <div className="absolute inset-0">
        {coords.map((coord, idx) => {
          const player = players[idx]
          return (
            <motion.div
              key={coord.pos}
              layout
              initial={false}
              animate={{ 
                left: `${coord.x}%`, 
                top: `${coord.y}%`,
                scale: player ? 1 : 0.8,
                opacity: player ? 1 : 0.3
              }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
            >
              <div className="flex flex-col items-center gap-2 group">
                <div 
                  className={clsx(
                    "w-14 h-14 rounded-full flex items-center justify-center text-base font-black text-white shadow-2xl border-4 transition-all duration-300",
                    player ? "border-white/40 scale-100" : "border-white/10 bg-white/5 border-dashed"
                  )}
                  style={player ? { backgroundColor: teamColor } : {}}
                >
                  {player?.player?.jersey_number ?? '?'}
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 shadow-lg">
                  <span className={clsx(
                    "text-[11px] font-black uppercase tracking-widest whitespace-nowrap",
                    player ? "text-white" : "text-slate-500"
                  )}>
                    {player?.player?.last_name || coord.pos}
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Ambiance Glow */}
      <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent to-black/20" />
    </div>
  )
}
