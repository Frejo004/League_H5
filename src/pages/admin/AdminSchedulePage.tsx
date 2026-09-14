import { useState } from 'react'
import { Zap, Check, Calendar } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTeams } from '@/hooks/useTeams'
import { useMatches } from '@/hooks/useMatches'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { MatchDateEditor } from '@/components/admin/MatchDateEditor'
import {
  generateRoundRobin,
  getRoundRobinRoundCount,
  fixtureKey,
  compareMatchesForScheduling,
  buildBalancedMatchdayUpdates,
  type SchedulableMatch,
} from '@/lib/matchScheduling'
import type { Match, MatchStatus } from '@/types/database'
import clsx from 'clsx'

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
      const generatedMatchdays = new Map<string, number>()
      rounds.forEach((round, index) => {
        const matchday = index + 1
        round.forEach(([homeId, awayId]) => {
          generatedMatchdays.set(fixtureKey(homeId, awayId), matchday)
        })
      })

      const existingFixtureKeys = new Set(
        (matches ?? []).map(match => fixtureKey(match.home_team_id, match.away_team_id))
      )

      // Construire tous les matchs à créer en filtrant ceux qui existent déjà
      const allMatchesToCreate = rounds.flatMap((round, i) => {
        const matchday = i + 1
        return round
          .filter(([homeId, awayId]) => !existingFixtureKeys.has(fixtureKey(homeId, awayId)))
          .map(([homeId, awayId]) => ({
            season_id: season.id,
            home_team_id: homeId,
            away_team_id: awayId,
            matchday,
            scheduled_at: null as string | null,
            venue: null as string | null,
          }))
      })

      let createdMatches: Match[] = []
      if (allMatchesToCreate.length > 0) {
        const { data, error } = await supabase
          .from('matches')
          // @ts-expect-error Supabase insert typing inference issue
          .insert(allMatchesToCreate)
          .select('*')
        if (error) throw error
        createdMatches = (data ?? []) as Match[]
      }

      const allSeasonMatches: SchedulableMatch[] = [
        ...(matches ?? []),
        ...createdMatches,
      ]
      const matchesByFixture = new Map<string, SchedulableMatch[]>()
      for (const match of allSeasonMatches) {
        const key = fixtureKey(match.home_team_id, match.away_team_id)
        if (!generatedMatchdays.has(key)) continue
        matchesByFixture.set(key, [...(matchesByFixture.get(key) ?? []), match])
      }

      const duplicateMatchIds = [...matchesByFixture.values()].flatMap(fixtureMatches =>
        fixtureMatches
          .sort(compareMatchesForScheduling)
          .slice(1)
          .map(match => match.id)
      )

      if (duplicateMatchIds.length > 0) {
        const { error } = await supabase
          .from('matches')
          .delete()
          .in('id', duplicateMatchIds)
        if (error) throw error
      }

      const uniqueSeasonMatches = allSeasonMatches.filter(match => !duplicateMatchIds.includes(match.id))
      const cancelledMatchesToRevive = uniqueSeasonMatches.filter(match => match.status === 'cancelled')
      if (cancelledMatchesToRevive.length > 0) {
        const reviveResults = await Promise.all(
          cancelledMatchesToRevive.map(match =>
            supabase
              .from('matches')
              // @ts-expect-error Supabase update typing inference issue
              .update({
                status: 'scheduled',
                home_score: null,
                away_score: null,
                played_at: null,
              })
              .eq('id', match.id)
          )
        )

        const reviveError = reviveResults.find(result => result.error)?.error
        if (reviveError) throw reviveError
      }

      const matchesForGeneration = uniqueSeasonMatches.map(match =>
        match.status === 'cancelled'
          ? { ...match, status: 'scheduled' as MatchStatus, played_at: null }
          : match
      )

      // Application de l'algorithme de rangement (Requirement 1, 2 & 3)
      // On ignore le matchday théorique du Round Robin pour forcer un rangement serré de 2 matchs/jour
      const matchdayUpdates = buildBalancedMatchdayUpdates(matchesForGeneration, true)

      if (matchdayUpdates.length > 0) {
        const updateResults = await Promise.all(
          matchdayUpdates.map(update =>
            supabase
              .from('matches')
              // @ts-expect-error Supabase update typing inference issue
              .update({ matchday: update.matchday })
              .eq('id', update.id)
          )
        )

        const updateError = updateResults.find(result => result.error)?.error
        if (updateError) throw updateError
      }

      // Invalider le cache des matchs pour la saison courante
      qc.invalidateQueries({ queryKey: ['matches', season.id] })
      qc.invalidateQueries({ queryKey: ['standings', season.id] })

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
  const totalRoundRobinRounds = getRoundRobinRoundCount(teamList.length)
  const roundsPerLeg = totalRoundRobinRounds / 2

  return (
    <div className="space-y-4">

      {/* Modale de confirmation génération calendrier */}
      {showGenConfirm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-surface/80 backdrop-blur-md" onClick={() => setShowGenConfirm(false)} />
          <div className="relative w-full max-w-sm bg-surface-card border border-surface-border rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="w-16 h-16 rounded-full bg-[#FFDF73]/20 border border-[#FFDF73]/30 flex items-center justify-center mx-auto mb-6">
              <Calendar size={28} className="text-[#FFDF73]" />
            </div>
            <h3 className="text-2xl font-black text-text-primary uppercase tracking-widest mb-3 text-center" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
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
                className="mt-2 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-text-primary transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">
          Calendrier
          {season && <span className="text-slate-500 font-normal text-sm ml-2">— {season.name}</span>}
        </h2>
      </div>

      {/* Generate panel */}
      {season && teamList.length >= 2 && (
        <div className="relative overflow-hidden p-5 rounded-2xl glass-morphism border border-[#FFDF73]/20 bg-linear-to-r from-[#FFDF73]/10 to-transparent space-y-3">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,var(--tw-gradient-stops))] from-[#FFDF73]/10 to-transparent pointer-events-none" />
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
                <Zap size={16} className="text-[#FFDF73]" />
                Génération automatique
              </p>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1.5">
                {teamList.length} équipes → {totalMatches} matchs
                <span className="block mt-0.5 text-[#FFDF73]/70">({roundsPerLeg} journées aller + {roundsPerLeg} journées retour)</span>
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
        <div className="card glass-morphism text-center py-8 border border-surface-border">
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
              <div key={day} className="card p-0 overflow-hidden glass-morphism border border-surface-border/60 shadow-xl">
                <div className="flex items-center justify-between px-5 py-3 border-b border-surface-border bg-surface-raised/50">
                  <span className="text-xl font-black text-text-primary uppercase tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                    Journée {day}
                  </span>
                  <span className={clsx(
                    "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm",
                    isRetour ? "bg-slate-700 text-slate-300 border border-slate-600" : "bg-[#FFDF73] text-black"
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
