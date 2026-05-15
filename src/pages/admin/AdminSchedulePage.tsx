import { useState, useEffect } from 'react'
import { Zap, Pencil, Check, X, Calendar } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTeams } from '@/hooks/useTeams'
import { useMatches, useUpdateMatch, type MatchWithTeams } from '@/hooks/useMatches'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { MatchStatus } from '@/types/database'
import clsx from 'clsx'

const STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: 'scheduled', label: 'Programmé' },
  { value: 'live', label: '🔴 En direct' },
  { value: 'completed', label: 'Terminé' },
  { value: 'cancelled', label: 'Annulé' },
]

// ── Algorithme round-robin aller-retour ───────────────────────────────────────
// Génère tous les matchs aller + retour pour n équipes.
// Retourne un tableau de journées, chaque journée contenant des paires [home, away].
function generateRoundRobin(teamIds: string[]): Array<Array<[string, string]>> {
  const n = teamIds.length
  const teams = [...teamIds]

  // Si nombre impair, ajouter un "bye" fictif
  if (n % 2 !== 0) teams.push('BYE')
  const total = teams.length
  const rounds: Array<Array<[string, string]>> = []

  // Aller
  for (let round = 0; round < total - 1; round++) {
    const pairs: Array<[string, string]> = []
    for (let i = 0; i < total / 2; i++) {
      const home = teams[i]
      const away = teams[total - 1 - i]
      if (home !== 'BYE' && away !== 'BYE') {
        pairs.push([home, away])
      }
    }
    rounds.push(pairs)
    // Rotation : fixe le premier, tourne les autres
    teams.splice(1, 0, teams.pop()!)
  }

  // Retour : inverser domicile/extérieur
  const returnRounds = rounds.map(r => r.map(([h, a]) => [a, h] as [string, string]))
  return [...rounds, ...returnRounds]
}

// ── Date editor pour un match ─────────────────────────────────────────────────
function MatchDateEditor({ match }: { match: MatchWithTeams }) {
  const updateMatch = useUpdateMatch()
  const [editing, setEditing] = useState(false)
  const [scheduledAt, setScheduledAt] = useState(
    match.scheduled_at ? match.scheduled_at.slice(0, 16) : ''
  )
  const [homeScore, setHomeScore] = useState(String(match.home_score ?? ''))
  const [awayScore, setAwayScore] = useState(String(match.away_score ?? ''))
  const [status, setStatus] = useState<MatchStatus>(match.status)
  const [showCancelModal, setShowCancelModal] = useState(false)

  useEffect(() => {
    if (!editing) {
      setScheduledAt(match.scheduled_at ? match.scheduled_at.slice(0, 16) : '')
      setHomeScore(String(match.home_score ?? ''))
      setAwayScore(String(match.away_score ?? ''))
      setStatus(match.status)
      setShowCancelModal(false)
    }
  }, [match.scheduled_at, match.home_score, match.away_score, match.status, editing])

  const home = match.home_team as { name: string; color: string }
  const away = match.away_team as { name: string; color: string }

  async function handleSave() {
    // Si on passe en annulé et que ce n'était pas déjà le cas, on demande confirmation
    if (status === 'cancelled' && match.status !== 'cancelled') {
      setShowCancelModal(true)
      return
    }

    await performUpdate(false)
  }

  async function performUpdate(deleteInfos: boolean) {
    if (deleteInfos) {
      // Supprimer les données liées avec vérification d'erreur
      const [resGoals, resAssists, resEvents, resVotes] = await Promise.all([
        supabase.from('goals').delete().eq('match_id', match.id),
        supabase.from('assists').delete().eq('match_id', match.id),
        supabase.from('match_events').delete().eq('match_id', match.id),
        supabase.from('mvp_votes').delete().eq('match_id', match.id),
      ])

      if (resGoals.error) console.error('Error deleting goals:', resGoals.error)
      if (resAssists.error) console.error('Error deleting assists:', resAssists.error)
      if (resEvents.error) console.error('Error deleting events:', resEvents.error)
      if (resVotes.error) console.error('Error deleting votes:', resVotes.error)

      await updateMatch.mutateAsync({
        id: match.id,
        status: 'cancelled',
        home_score: null,
        away_score: null,
        scheduled_at: null,
        played_at: null,
      })
    } else {
      await updateMatch.mutateAsync({
        id: match.id,
        scheduled_at: scheduledAt || null,
        home_score: homeScore !== '' ? parseInt(homeScore) : null,
        away_score: awayScore !== '' ? parseInt(awayScore) : null,
        status,
        played_at: status === 'completed' ? (match.played_at ?? new Date().toISOString()) : match.played_at,
      })
    }
    setEditing(false)
    setShowCancelModal(false)
  }

  const dateLabel = match.scheduled_at
    ? new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(match.scheduled_at))
    : 'À venir'

  return (
    <div className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors">
      {/* Match row */}
      <div className="flex items-center gap-3 px-4 py-3 relative z-10">
        {/* Home */}
        <div className="flex items-center justify-end gap-2.5 flex-1 min-w-0">
          <span className="text-sm font-black text-white uppercase tracking-wider truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{home.name}</span>
          <span className="w-3 h-3 rounded-sm shrink-0 shadow-sm" style={{ backgroundColor: home.color }} />
        </div>

        {/* Score / date */}
        <div className="shrink-0 text-center min-w-[90px] px-2">
          {match.status === 'completed' ? (
            <span className="text-xl font-black tabular-nums text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {match.home_score} <span className="text-[#FFDF73] text-sm mx-0.5">-</span> {match.away_score}
            </span>
          ) : match.status === 'live' ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl font-black tabular-nums text-red-500 animate-pulse" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {match.home_score ?? 0} <span className="text-slate-600 text-sm mx-0.5">-</span> {match.away_score ?? 0}
              </span>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                LIVE
              </span>
            </div>
          ) : match.status === 'cancelled' ? (
            <span className="text-[10px] font-black uppercase tracking-widest text-red-500/60 bg-red-500/5 px-2 py-0.5 rounded border border-red-500/10">
              Annulé
            </span>
          ) : (
            <span className={`text-[10px] font-bold uppercase tracking-widest ${match.scheduled_at ? 'text-[#FFDF73]' : 'text-slate-600'}`}>
              {dateLabel}
            </span>
          )}
        </div>

        {/* Away */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="w-3 h-3 rounded-sm shrink-0 shadow-sm" style={{ backgroundColor: away.color }} />
          <span className="text-sm font-black text-white uppercase tracking-wider truncate" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{away.name}</span>
        </div>

        {/* Edit button */}
        <button
          onClick={() => setEditing(!editing)}
          className="text-slate-500 hover:text-white bg-black/20 hover:bg-white/10 p-2 rounded-lg shrink-0 transition-colors border border-white/5"
        >
          <Pencil size={13} />
        </button>
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="px-5 pb-5 pt-2 space-y-4 bg-black/40 border-t border-white/10 shadow-inner relative overflow-hidden">
          {/* Modal Annulation — Overlay plein écran pour une visibilité totale */}
          {showCancelModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-[#070b14]/90 backdrop-blur-md animate-in fade-in duration-300"
                onClick={() => setShowCancelModal(false)}
              />
              
              {/* Modal Content */}
              <div className="relative w-full max-w-sm bg-[#0f1420] border border-white/10 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300">
                <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-6 text-red-500">
                  <X size={32} />
                </div>
                
                <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-3 text-center" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                  Annuler le match ?
                </h3>
                
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8 text-center leading-relaxed">
                  Voulez-vous conserver les statistiques (buts, cartons) ou tout supprimer définitivement ?
                </p>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => performUpdate(false)}
                    className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                  >
                    Conserver les infos
                  </button>
                  <button 
                    onClick={() => performUpdate(true)}
                    className="w-full py-3.5 rounded-2xl bg-red-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-[0_15px_30px_-5px_rgba(220,38,38,0.4)] active:scale-95"
                  >
                    Tout supprimer
                  </button>
                  <button 
                    onClick={() => setShowCancelModal(false)}
                    className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
                  >
                    Retour à l'édition
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Date & heure</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="input text-sm py-2 bg-black/40 border-white/10"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Score (dom – ext)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={homeScore} onChange={e => setHomeScore(e.target.value)}
                  className="input text-base font-black tabular-nums py-2 text-center bg-black/40 border-white/10" min={0} placeholder="0" style={{ fontFamily: "'Barlow Condensed', sans-serif" }} />
                <span className="text-slate-500 shrink-0 font-bold">–</span>
                <input type="number" value={awayScore} onChange={e => setAwayScore(e.target.value)}
                  className="input text-base font-black tabular-nums py-2 text-center bg-black/40 border-white/10" min={0} placeholder="0" style={{ fontFamily: "'Barlow Condensed', sans-serif" }} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Statut</label>
              <select value={status} onChange={e => setStatus(e.target.value as MatchStatus)}
                className="input text-sm py-2 bg-black/40 border-white/10">
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={updateMatch.isPending}
              className="btn-primary text-xs font-bold uppercase tracking-wider py-2 px-4 flex items-center gap-1.5">
              {updateMatch.isPending ? <LoadingSpinner size="sm" /> : <Check size={14} />}
              Enregistrer
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary py-2 px-3 bg-surface-raised border border-white/10 hover:bg-white/10">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export function AdminSchedulePage() {
  const { data: season } = useActiveSeason()
  const { data: teams } = useTeams(season?.id)
  const { data: matches, isLoading } = useMatches(season?.id)
  const qc = useQueryClient()

  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [genSuccess, setGenSuccess] = useState(false)
  const [showGenConfirm, setShowGenConfirm] = useState(false)

  const matchdays = [...new Set((matches ?? []).map(m => m.matchday))].sort((a, b) => a - b)
  const teamList = teams ?? []

  // ── Génération automatique aller-retour ──────────────────────────────────
  async function handleGenerate() {
    if (!season || teamList.length < 2) return
    // Si des matchs existent déjà, demander confirmation via modale custom
    if ((matches ?? []).length > 0) {
      setShowGenConfirm(true)
      return
    }
    await performGenerate()
  }

  async function performGenerate() {
    if (!season || teamList.length < 2) return
    setShowGenConfirm(false)
    setGenerating(true)
    setGenError(null)
    setGenSuccess(false)

    try {
      const rounds = generateRoundRobin(teamList.map(t => t.id))
      // Construire tous les matchs à créer en filtrant ceux qui existent déjà
      const allMatchesToCreate = rounds.flatMap((round, i) => {
        const matchday = i + 1
        return round
          .filter(([homeId, awayId]) =>
            !(matches ?? []).some(
              m => m.home_team_id === homeId && m.away_team_id === awayId && m.matchday === matchday
            )
          )
          .map(([homeId, awayId]) => ({
            season_id: season.id,
            home_team_id: homeId,
            away_team_id: awayId,
            matchday,
            scheduled_at: null as string | null,
            venue: null as string | null,
          }))
      })

      if (allMatchesToCreate.length === 0) {
        setGenSuccess(true)
        setTimeout(() => setGenSuccess(false), 3000)
        return
      }

      // Insérer tous les matchs en un seul batch
      const { error } = await supabase
        .from('matches')
        .insert(allMatchesToCreate)
      if (error) throw error

      // Invalider le cache des matchs pour la saison courante
      qc.invalidateQueries({ queryKey: ['matches', season.id] })

      setGenSuccess(true)
      setTimeout(() => setGenSuccess(false), 3000)
    } catch (err: unknown) {
      setGenError(err instanceof Error ? err.message : 'Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  const totalMatches = teamList.length >= 2
    ? teamList.length % 2 === 0
      ? teamList.length * (teamList.length - 1)
      : (teamList.length - 1) * teamList.length
    : 0

  return (
    <div className="space-y-4">

      {/* Modale de confirmation génération calendrier */}
      {showGenConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#070b14]/90 backdrop-blur-md" onClick={() => setShowGenConfirm(false)} />
          <div className="relative w-full max-w-sm bg-[#0f1420] border border-white/10 rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="w-16 h-16 rounded-full bg-[#FFDF73]/20 border border-[#FFDF73]/30 flex items-center justify-center mx-auto mb-6">
              <Calendar size={28} className="text-[#FFDF73]" />
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-3 text-center" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Regénérer le calendrier ?
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8 text-center leading-relaxed">
              Des matchs existent déjà. Les nouveaux matchs seront ajoutés sans supprimer les existants.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={performGenerate}
                className="w-full py-3.5 rounded-2xl bg-[#C8F135] text-black text-[11px] font-black uppercase tracking-widest hover:bg-[#d4f55a] transition-all active:scale-95"
              >
                Confirmer la génération
              </button>
              <button
                onClick={() => setShowGenConfirm(false)}
                className="mt-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">
          Calendrier
          {season && <span className="text-slate-500 font-normal text-sm ml-2">— {season.name}</span>}
        </h2>
      </div>

      {/* Generate panel */}
      {season && teamList.length >= 2 && (
        <div className="relative overflow-hidden p-5 rounded-2xl glass-morphism border border-[#FFDF73]/20 bg-gradient-to-r from-[#FFDF73]/10 to-transparent space-y-3">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,_var(--tw-gradient-stops))] from-[#FFDF73]/10 to-transparent pointer-events-none" />
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <Zap size={16} className="text-[#FFDF73]" />
                Génération automatique
              </p>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1.5">
                {teamList.length} équipes → {totalMatches} matchs
                <span className="block mt-0.5 text-[#FFDF73]/70">({teamList.length - 1} journées aller + {teamList.length - 1} journées retour)</span>
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-[0_0_15px_rgba(200,241,53,0.3)] hover:shadow-[0_0_20px_rgba(200,241,53,0.5)] py-2.5 px-4"
            >
              {generating ? <LoadingSpinner size="sm" /> : <Calendar size={14} />}
              {generating ? 'Génération…' : 'Générer le calendrier'}
            </button>
          </div>

          {genError && <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">{genError}</p>}
          {genSuccess && (
            <p className="text-green-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Check size={12} /> Calendrier généré avec succès !
            </p>
          )}
        </div>
      )}

      {teamList.length < 2 && season && (
        <div className="card glass-morphism text-center py-6 border border-amber-500/20 bg-amber-500/5">
          <p className="text-amber-500 text-xs font-bold uppercase tracking-widest">
            Il faut au moins 2 équipes pour générer un calendrier.
          </p>
        </div>
      )}

      {/* Matches list */}
      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
      ) : !matches?.length ? (
        <div className="card glass-morphism text-center py-8 border border-white/10">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
            Aucun match. Cliquez sur "Générer le calendrier" pour créer tous les matchs aller-retour.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {matchdays.map(day => {
            const dayMatches = (matches ?? []).filter(m => m.matchday === day)
            const isRetour = day > (matchdays.length / 2)
            return (
              <div key={day} className="card p-0 overflow-hidden glass-morphism border border-white/10">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-black/40">
                  <span className="text-lg font-black text-white uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    Journée {day}
                  </span>
                  <span className={clsx(
                    "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm",
                    isRetour ? "bg-slate-300 text-black" : "bg-[#FFDF73] text-black"
                  )}>
                    {isRetour ? 'Retour' : 'Aller'}
                  </span>
                </div>
                {dayMatches.map(match => (
                  <MatchDateEditor key={match.id} match={match} />
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
