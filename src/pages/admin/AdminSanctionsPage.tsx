/**
 * AdminSanctionsPage — Gestion des suspensions et discipline
 * Permet de suivre les cartons et de gérer les joueurs bannis
 */
import { useState } from 'react'
import {
  ShieldAlert, ShieldCheck, Trash2, Plus,
  UserX, Info, Calendar, History, Search,
  AlertCircle
} from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useDisciplinaryStats, useSuspensions } from '@/hooks/useDisciplinaryStats'
import { usePlayers } from '@/hooks/usePlayers'
import { clsx } from 'clsx'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function AdminSanctionsPage() {
  const { data: season } = useActiveSeason()
  const { data: stats } = useDisciplinaryStats(season?.id)
  const { data: suspensions = [], isLoading: suspensionsLoading, addSuspension, toggleSuspension, deleteSuspension, updateServed } = useSuspensions(season?.id)
  const { data: allPlayers = [] } = usePlayers(season?.id)

  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Form state
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [reason, setReason] = useState('')
  const [matchesCount, setMatchesCount] = useState(1)

  const activeSuspensions = suspensions.filter(s => s.is_active)
  const pastSuspensions = suspensions.filter(s => !s.is_active)

  const handleAdd = async () => {
    if (!selectedPlayerId || !reason || !season) return
    await addSuspension.mutateAsync({
      player_id: selectedPlayerId,
      season_id: season.id,
      reason,
      matches_count: matchesCount,
      is_active: true
    })
    setShowAddForm(false)
    setSelectedPlayerId('')
    setReason('')
    setMatchesCount(1)
  }

  const filteredPlayers = allPlayers.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // On attend seulement que les suspensions soient chargées — les stats peuvent arriver après
  if (suspensionsLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── Header & Action ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="text-red-500" size={20} />
            Discipline & Sanctions
          </h2>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-widest mt-1">
            Gérer les suspensions et suivre les cartons de la saison
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest"
        >
          <Plus size={16} />
          Nouvelle Sanction
        </button>
      </div>

      {/* ── Formulaire d'ajout ── */}
      {showAddForm && (
        <div className="card border-red-500/30 bg-red-500/3 space-y-4 animate-in slide-in-from-top-4 duration-300 shadow-lg">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Ajouter une suspension manuelle</h3>
            <button onClick={() => setShowAddForm(false)} className="text-text-secondary hover:text-text-primary transition-colors">
              <UserX size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1.5 block">Joueur</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="input pl-9 text-xs mb-2"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <select
                  value={selectedPlayerId}
                  onChange={e => setSelectedPlayerId(e.target.value)}
                  className="input text-xs"
                >
                  <option value="">— Sélectionner le joueur —</option>
                  {filteredPlayers.map(p => (
                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.teams?.name})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Motif</label>
              <input
                type="text"
                placeholder="Ex: Comportement antisportif..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="input text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Nombre de matchs</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={matchesCount}
                  onChange={e => setMatchesCount(parseInt(e.target.value))}
                  className="input text-xs w-20"
                />
                <button
                  onClick={handleAdd}
                  disabled={!selectedPlayerId || !reason || addSuspension.isPending}
                  className="btn-primary flex-1 py-2 text-[10px] font-black uppercase tracking-widest"
                >
                  Confirmer la sanction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Suspensions Actives (Main Column) ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest flex items-center gap-2">
              <Calendar size={16} className="text-primary-400" />
              Suspensions en cours
              <span className="ml-2 text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full">
                {activeSuspensions.length}
              </span>
            </h3>
          </div>

          {activeSuspensions.length === 0 ? (
            <div className="card py-12 text-center opacity-50">
              <ShieldCheck size={32} className="text-emerald-500 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Aucun joueur suspendu actuellement
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {activeSuspensions.map(s => (
                <div key={s.id} className="card border-red-500/20 bg-linear-to-r from-red-500/5 to-transparent p-0 overflow-hidden group">
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 font-black shrink-0">
                      {s.player?.first_name[0]}{s.player?.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-text-primary truncate">
                          {s.player?.first_name} {s.player?.last_name}
                        </span>
                        <span
                          className={clsx(
                            "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                            s.is_auto_generated ? "bg-blue-500/10 text-blue-500" : "bg-slate-500/10 text-slate-500"
                          )}
                        >
                          {s.is_auto_generated ? 'Auto' : 'Manuelle'}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                          style={{ backgroundColor: s.player?.team?.color + '20', color: s.player?.team?.color }}
                        >
                          {s.player?.team?.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-1.5">
                        <Info size={12} className="text-red-500/50" />
                        {s.reason}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Matchs purgés</span>
                        <span className="text-sm font-black text-text-primary tabular-nums">{s.matches_served} / {s.matches_count}</span>
                      </div>
                      <div className="w-32 h-1.5 rounded-full bg-surface/50 border border-surface-border overflow-hidden">
                        <div
                          className="h-full bg-red-500 transition-all duration-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                          style={{ width: `${(s.matches_served / s.matches_count) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => updateServed.mutate({ id: s.id, matches_served: Math.min(s.matches_count, s.matches_served + 1) })}
                        title="+1 match purgé"
                        className="p-2 rounded-lg bg-surface-raised hover:bg-surface-raised/80 text-slate-500 hover:text-text-primary transition-all border border-surface-border"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => toggleSuspension.mutate({ id: s.id, is_active: false })}
                        title="Lever la sanction"
                        className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-all"
                      >
                        <ShieldCheck size={14} />
                      </button>
                      <button
                        onClick={() => deleteSuspension.mutate(s.id)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Historique ── */}
          {pastSuspensions.length > 0 && (
            <div className="pt-4 space-y-3">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <History size={12} />
                Sanctions levées récemment
              </h4>
              <div className="space-y-2 opacity-80">
                {pastSuspensions.slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-surface-border bg-surface-raised/30">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-text-secondary">{s.player?.first_name} {s.player?.last_name}</span>
                      <span className="text-[10px] text-slate-500">({s.reason})</span>
                    </div>
                    <button
                      onClick={() => toggleSuspension.mutate({ id: s.id, is_active: true })}
                      className="text-[9px] font-black uppercase tracking-widest text-primary-400 hover:text-primary-300"
                    >
                      Réactiver
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Statistiques disciplinaires (Side Column) ── */}
        <div className="space-y-6">

          {/* Top Cartons */}
          <div className="card">
            <h3 className="text-[11px] font-black text-text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-400" />
              Joueurs les plus sanctionnés
            </h3>
            <div className="space-y-3">
              {stats?.players.slice(0, 5).map((p, i) => (
                <div key={p.player_id} className="flex items-center justify-between p-2 rounded-lg bg-surface-raised/50 border border-surface-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-bold text-slate-500 w-4">{i + 1}.</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-primary truncate">{p.first_name} {p.last_name}</p>
                      <p className="text-[9px] text-slate-500 truncate">{p.team_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {p.yellow_cards > 0 && (
                      <div className="flex items-center gap-1">
                        {/* Indicateur d'accumulation de cartons jaunes */}
                        {/* Ceci est un exemple, la logique pour calculer les "non-purgés" devrait venir de la DB */}
                        {/* Pour l'instant, on affiche juste le total */}
                        {p.yellow_cards > 0 && (
                          <span className="text-[9px] font-bold text-yellow-400 uppercase tracking-wider">
                            {p.yellow_cards % 3 > 0 && `${p.yellow_cards % 3}/3`}
                          </span>
                        )}



                        <div className="w-1.5 h-2 bg-yellow-400 rounded-sm" />
                        <span className="text-xs font-black text-yellow-400 tabular-nums">{p.yellow_cards}</span>
                      </div>
                    )}
                    {p.red_cards > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-2 bg-red-500 rounded-sm" />
                        <span className="text-xs font-black text-red-500 tabular-nums">{p.red_cards}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rappel Règlement */}
          <div className="card border-blue-500/20 bg-blue-500/2">
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Note Automatique</h3>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Le système crée automatiquement une suspension de 1 match pour chaque carton rouge direct inséré en live.
              Les jaunes sont à suivre manuellement selon le barème (3 jaunes = 1 match).
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
