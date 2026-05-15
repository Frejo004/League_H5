import { useState } from 'react'
import { Users, UserCheck, Shield, ChevronRight, Edit3, Save, X } from 'lucide-react'
import { useMatchLineups, useUpdateMatchLineup } from '@/hooks/useLineups'
import { usePlayersByTeam } from '@/hooks/usePlayers'
import { useAuth } from '@/hooks/useAuth'
import { clsx } from 'clsx'

import type { TeamRef } from '@/types/database'

interface MatchLineupsProps {
  matchId: string
  homeTeam: TeamRef
  awayTeam: TeamRef
}

export function MatchLineups({ matchId, homeTeam, awayTeam }: MatchLineupsProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'away'>('home')
  const { data: lineups, isLoading } = useMatchLineups(matchId)
  const { isAdmin, isCaptain, profile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'pitch'>('pitch')

  const activeTeam = activeTab === 'home' ? homeTeam : awayTeam
  const teamLineup = lineups?.filter(l => l.team_id === activeTeam.id) ?? []
  
  // Vérifier si l'utilisateur peut modifier (Admin ou Capitaine de l'équipe active)
  const canEdit = isAdmin || (isCaptain && activeTeam.captain_id === profile?.id)

  if (isLoading) return <div className="p-8 text-center text-slate-500">Chargement des compositions...</div>

  return (
    <div className="card p-0 overflow-hidden glass-morphism border border-white/10">
      {/* Tabs Équipes */}
      <div className="flex border-b border-white/5 bg-black/20">
        {[homeTeam, awayTeam].map((team, idx) => {
          const isHome = idx === 0
          const isActive = (isHome && activeTab === 'home') || (!isHome && activeTab === 'away')
          return (
            <button
              key={team.id}
              onClick={() => { setActiveTab(isHome ? 'home' : 'away'); setIsEditing(false) }}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black uppercase tracking-widest transition-all",
                isActive ? "text-white" : "text-slate-500 hover:text-slate-300"
              )}
            >
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: team.color }} />
              {team.name}
              {isActive && (
                <div className="absolute bottom-0 h-0.5 w-full bg-current" style={{ backgroundColor: team.color }} />
              )}
            </button>
          )
        })}
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-slate-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Feuille de Match</h3>
            </div>
            
            {/* Toggle View Mode */}
            {!isEditing && (
              <div className="flex p-0.5 bg-black/40 rounded-lg border border-white/5">
                <button 
                  onClick={() => setViewMode('pitch')}
                  className={clsx(
                    "px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter transition-all",
                    viewMode === 'pitch' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Terrain
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={clsx(
                    "px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter transition-all",
                    viewMode === 'list' ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  Liste
                </button>
              </div>
            )}
          </div>
          
          {canEdit && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              <Edit3 size={12} />
              Modifier
            </button>
          )}
        </div>

        {isEditing ? (
          <LineupEditor 
            matchId={matchId} 
            teamId={activeTeam.id} 
            onClose={() => setIsEditing(false)}
            initialStarters={teamLineup.filter(l => l.is_starter).map(l => l.player_id)}
            initialSubs={teamLineup.filter(l => !l.is_starter).map(l => l.player_id)}
          />
        ) : (
          <div className="space-y-8">
            {/* Titulaires */}
            <section>
              <div className="flex items-center justify-between mb-3 px-2">
                <div className="flex items-center gap-2">
                  <UserCheck size={14} className="text-[#C8F135]" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titulaires</span>
                </div>
                <span className="text-[9px] font-bold text-slate-600">{teamLineup.filter(l => l.is_starter).length} Joueurs</span>
              </div>

              {viewMode === 'pitch' ? (
                <PitchView players={teamLineup.filter(l => l.is_starter)} teamColor={activeTeam.color} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {teamLineup.filter(l => l.is_starter).length > 0 ? (
                    teamLineup.filter(l => l.is_starter).map(l => (
                      <PlayerRow key={l.id} lineup={l} />
                    ))
                  ) : (
                    <p className="col-span-2 py-4 text-center text-xs text-slate-600 italic">Aucune composition enregistrée</p>
                  )}
                </div>
              )}
            </section>

            {/* Remplaçants */}
            <section>
              <div className="flex items-center gap-2 mb-3 px-2">
                <Shield size={14} className="text-blue-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Remplaçants</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {teamLineup.filter(l => !l.is_starter).map(l => (
                  <PlayerRow key={l.id} lineup={l} />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

function LineupEditor({ matchId, teamId, onClose, initialStarters, initialSubs }: any) {
  const { data: players } = usePlayersByTeam(teamId)
  const updateLineup = useUpdateMatchLineup()
  
  const [starters, setStarters] = useState<string[]>(initialStarters)
  const [subs, setSubs] = useState<string[]>(initialSubs)

  const handleTogglePlayer = (playerId: string) => {
    if (starters.includes(playerId)) {
      setStarters(starters.filter(id => id !== playerId))
      setSubs([...subs, playerId])
    } else if (subs.includes(playerId)) {
      setSubs(subs.filter(id => id !== playerId))
    } else {
      if (starters.length >= 5) {
        // Déjà 5 titulaires, on ajoute en remplaçant directement
        setSubs([...subs, playerId])
      } else {
        setStarters([...starters, playerId])
      }
    }
  }

  const handleSave = async () => {
    await updateLineup.mutateAsync({
      matchId,
      teamId,
      starters,
      substitutes: subs
    })
    onClose()
  }

  const canSave = starters.length === 5

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between px-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Sélectionnez le "5 Majeur"
        </p>
        <span className={clsx(
          "text-[10px] font-black uppercase px-2 py-0.5 rounded",
          starters.length === 5 ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
        )}>
          {starters.length} / 5 titulaires
        </span>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {(players ?? []).map(player => {
          const isStarter = starters.includes(player.id)
          const isSub = subs.includes(player.id)
          const isSelected = isStarter || isSub

          return (
            <button
              key={player.id}
              onClick={() => handleTogglePlayer(player.id)}
              className={clsx(
                "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                isStarter ? "bg-[#C8F135]/10 border-[#C8F135]/30" : 
                isSub ? "bg-blue-500/10 border-blue-500/30" : 
                "bg-black/20 border-white/5 opacity-50"
              )}
            >
              <div className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black",
                isSelected ? "bg-black/40 text-white" : "bg-white/5 text-slate-600"
              )}>
                {player.jersey_number ?? '—'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={clsx("text-sm font-bold truncate", isSelected ? "text-white" : "text-slate-500")}>
                  {player.first_name} {player.last_name}
                </p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">
                  {player.position ?? 'Joueur'}
                </p>
              </div>
              <div className={clsx(
                "px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter",
                isStarter ? "bg-[#C8F135] text-black" : 
                isSub ? "bg-blue-500 text-white" : 
                "bg-white/5 text-slate-600"
              )}>
                {isStarter ? 'Titulaire' : isSub ? 'Remplaçant' : 'Absent'}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 pt-4 border-t border-white/5">
        <button 
          onClick={handleSave}
          disabled={updateLineup.isPending || !canSave}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {updateLineup.isPending ? "Enregistrement..." : <Save size={16} />}
          {canSave ? 'Valider le 5 Majeur' : 'Sélectionner 5 titulaires'}
        </button>
        <button onClick={onClose} className="btn-secondary px-6">
          <X size={18} />
        </button>
      </div>

      <p className="text-[9px] text-slate-500 italic text-center px-4">
        * Note : Les changements sont illimités et permanents (style basketball).
      </p>
    </div>
  )
}

function PlayerRow({ lineup }: { lineup: any }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
      <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-xs font-black text-white border border-white/10">
        {lineup.player?.jersey_number ?? '—'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">
          {lineup.player?.first_name} {lineup.player?.last_name}
        </p>
        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">
          {lineup.player?.position ?? 'Joueur'}
        </p>
      </div>
    </div>
  )
}

function PitchView({ players, teamColor }: { players: any[], teamColor: string }) {
  // Grouper par position simple pour le placement sur le terrain
  const positions = {
    gk: players.filter(p => p.player?.position === 'goalkeeper'),
    def: players.filter(p => p.player?.position === 'defender'),
    mid: players.filter(p => p.player?.position === 'midfielder'),
    fwd: players.filter(p => p.player?.position === 'forward'),
    other: players.filter(p => !['goalkeeper', 'defender', 'midfielder', 'forward'].includes(p.player?.position || ''))
  }

  return (
    <div className="relative aspect-[3/4] sm:aspect-[4/3] w-full rounded-2xl overflow-hidden bg-[#1a4a1a] border border-white/10 shadow-inner">
      {/* Texture herbe */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />
      
      {/* Lignes du terrain */}
      <div className="absolute inset-4 border-2 border-white/20 rounded-sm pointer-events-none" />
      <div className="absolute inset-x-4 top-1/2 h-0.5 bg-white/20 -translate-y-1/2 pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 w-24 h-24 border-2 border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      
      {/* Surface de réparation (bas) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/2 h-20 border-2 border-white/20 border-b-0 pointer-events-none" />
      
      {/* Placement des joueurs — Formation 1-2-2 pour foot à 5 */}
      <div className="absolute inset-0 p-8 flex flex-col justify-between">
        {/* Attaquants (2) */}
        <div className="flex justify-around items-center h-1/4">
          {positions.fwd.slice(0, 2).map(p => <PitchPlayer key={p.id} player={p} color={teamColor} />)}
          {positions.other.length > 0 && positions.fwd.length < 2 && positions.other.slice(0, 2 - positions.fwd.length).map(p => <PitchPlayer key={p.id} player={p} color={teamColor} />)}
        </div>
        
        {/* Milieux / Défenseurs (2) */}
        <div className="flex justify-around items-center h-1/4">
          {[...positions.mid, ...positions.def].slice(0, 2).map(p => <PitchPlayer key={p.id} player={p} color={teamColor} />)}
        </div>
        
        {/* Gardien (1) */}
        <div className="flex justify-center items-center h-1/4">
          {positions.gk.length > 0 ? (
             <PitchPlayer player={positions.gk[0]} color={teamColor} />
          ) : (
            <div className="w-10 h-10 rounded-full border-2 border-white/10 border-dashed" />
          )}
        </div>
      </div>
    </div>
  )
}

function PitchPlayer({ player, color }: { player: any, color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 group animate-fade-in">
      <div 
        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black text-white shadow-lg border-2 border-white/20 transition-transform group-hover:scale-110"
        style={{ backgroundColor: color }}
      >
        {player.player?.jersey_number ?? '?'}
      </div>
      <div className="px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm border border-white/10">
        <span className="text-[9px] font-bold text-white uppercase whitespace-nowrap">
          {player.player?.last_name}
        </span>
      </div>
    </div>
  )
}
