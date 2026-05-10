import { useState, useEffect } from 'react'
import { Zap, Pencil, Check, X, Calendar } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTeams } from '@/hooks/useTeams'
import { useMatches, useCreateMatch, useUpdateMatch, type MatchWithTeams } from '@/hooks/useMatches'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { MatchStatus } from '@/types/database'

const STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: 'scheduled', label: 'Programmé' },
  { value: 'live',      label: '🔴 En direct' },
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

  useEffect(() => {
    if (!editing) {
      setScheduledAt(match.scheduled_at ? match.scheduled_at.slice(0, 16) : '')
      setHomeScore(String(match.home_score ?? ''))
      setAwayScore(String(match.away_score ?? ''))
      setStatus(match.status)
    }
  }, [match.scheduled_at, match.home_score, match.away_score, match.status, editing])

  const home = match.home_team as { name: string; color: string }
  const away = match.away_team as { name: string; color: string }

  async function handleSave() {
    await updateMatch.mutateAsync({
      id: match.id,
      scheduled_at: scheduledAt || null,
      home_score: homeScore !== '' ? parseInt(homeScore) : null,
      away_score: awayScore !== '' ? parseInt(awayScore) : null,
      status,
      played_at: status === 'completed' ? (match.played_at ?? new Date().toISOString()) : match.played_at,
    })
    setEditing(false)
  }

  const dateLabel = match.scheduled_at
    ? new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(match.scheduled_at))
    : 'À venir'

  return (
    <div className="border-b border-surface-border/40 last:border-b-0">
      {/* Match row */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        {/* Home */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: home.color }} />
          <span className="text-sm text-slate-200 truncate font-medium">{home.name}</span>
        </div>

        {/* Score / date */}
        <div className="shrink-0 text-center min-w-[100px]">
          {match.status === 'completed' ? (
            <span className="text-sm font-bold text-white tabular-nums">
              {match.home_score} – {match.away_score}
            </span>
          ) : (
            <span className={`text-xs font-medium ${match.scheduled_at ? 'text-slate-300' : 'text-slate-600'}`}>
              {dateLabel}
            </span>
          )}
        </div>

        {/* Away */}
        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
          <span className="text-sm text-slate-200 truncate font-medium text-right">{away.name}</span>
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: away.color }} />
        </div>

        {/* Edit button */}
        <button
          onClick={() => setEditing(!editing)}
          className="text-slate-600 hover:text-slate-300 p-1 shrink-0 transition-colors"
        >
          <Pencil size={13} />
        </button>
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="px-4 pb-3 space-y-2 bg-surface-raised border-t border-surface-border/40">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <div>
              <label className="label">Date & heure</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="input text-sm py-1.5"
              />
            </div>
            <div>
              <label className="label">Score (dom – ext)</label>
              <div className="flex items-center gap-1.5">
                <input type="number" value={homeScore} onChange={e => setHomeScore(e.target.value)}
                  className="input text-sm py-1.5 text-center" min={0} placeholder="0" />
                <span className="text-slate-500 shrink-0">–</span>
                <input type="number" value={awayScore} onChange={e => setAwayScore(e.target.value)}
                  className="input text-sm py-1.5 text-center" min={0} placeholder="0" />
              </div>
            </div>
            <div>
              <label className="label">Statut</label>
              <select value={status} onChange={e => setStatus(e.target.value as MatchStatus)}
                className="input text-sm py-1.5">
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={updateMatch.isPending}
              className="btn-primary text-sm py-1.5 flex items-center gap-1.5">
              {updateMatch.isPending ? <LoadingSpinner size="sm" /> : <Check size={13} />}
              Enregistrer
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary text-sm py-1.5">
              <X size={13} />
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
  const createMatch = useCreateMatch()
  const qc = useQueryClient()

  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [genSuccess, setGenSuccess] = useState(false)

  const matchdays = [...new Set((matches ?? []).map(m => m.matchday))].sort((a, b) => a - b)
  const teamList = teams ?? []

  // ── Génération automatique aller-retour ──────────────────────────────────
  async function handleGenerate() {
    if (!season || teamList.length < 2) return
    if ((matches ?? []).length > 0) {
      if (!confirm('Des matchs existent déjà. Voulez-vous quand même générer le calendrier complet ?')) return
    }

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
            season_id:    season.id,
            home_team_id: homeId,
            away_team_id: awayId,
            matchday,
            scheduled_at: null as string | null,
            venue:        null as string | null,
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">
          Calendrier
          {season && <span className="text-slate-500 font-normal text-sm ml-2">— {season.name}</span>}
        </h2>
      </div>

      {/* Generate panel */}
      {season && teamList.length >= 2 && (
        <div className="card space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap size={14} className="text-primary-400" />
                Génération automatique
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {teamList.length} équipes → {totalMatches} matchs
                ({teamList.length - 1} journées aller + {teamList.length - 1} journées retour)
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="btn-primary flex items-center gap-1.5 shrink-0"
            >
              {generating ? <LoadingSpinner size="sm" /> : <Calendar size={14} />}
              {generating ? 'Génération…' : 'Générer le calendrier'}
            </button>
          </div>

          {genError && <p className="text-red-400 text-xs">{genError}</p>}
          {genSuccess && (
            <p className="text-green-400 text-xs flex items-center gap-1.5">
              <Check size={12} /> Calendrier généré avec succès !
            </p>
          )}
        </div>
      )}

      {teamList.length < 2 && season && (
        <div className="card text-center py-6">
          <p className="text-slate-400 text-sm">
            Il faut au moins 2 équipes pour générer un calendrier.
          </p>
        </div>
      )}

      {/* Matches list */}
      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
      ) : !matches?.length ? (
        <div className="card text-center py-8">
          <p className="text-slate-500 text-sm">
            Aucun match. Cliquez sur "Générer le calendrier" pour créer tous les matchs aller-retour.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {matchdays.map(day => {
            const dayMatches = (matches ?? []).filter(m => m.matchday === day)
            const isRetour = day > (matchdays.length / 2)
            return (
              <div key={day} className="card p-0 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border bg-surface-raised">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Journée {day}
                  </span>
                  <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-wider">
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
