import { useState, useMemo } from 'react'
import { Zap, Pencil, Check, X, Calendar, Search, User, ShieldCheck, Video } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useTeams } from '@/hooks/useTeams'
import { useMatches, useUpdateMatch, type MatchWithTeams } from '@/hooks/useMatches'
import { usePlayers } from '@/hooks/usePlayers'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Match, MatchStatus, PlayerWithTeam } from '@/types/database'
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

type SchedulableMatch = Pick<
  Match,
  'id' | 'home_team_id' | 'away_team_id' | 'matchday' | 'scheduled_at' | 'played_at' | 'status' | 'created_at'
>

const SCHEDULABLE_MATCH_SELECT = 'id,home_team_id,away_team_id,matchday,scheduled_at,played_at,status,created_at'

type MatchdayBalanceOptions = {
  requireTwoMatches?: boolean
  keepCancelledSeparate?: boolean
}

function getRoundRobinRoundCount(teamCount: number) {
  if (teamCount < 2) return 0
  return (teamCount % 2 === 0 ? teamCount - 1 : teamCount) * 2
}

function fixtureKey(homeTeamId: string, awayTeamId: string) {
  return `${homeTeamId}:${awayTeamId}`
}

function compareNullableDate(a?: string | null, b?: string | null) {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return new Date(a).getTime() - new Date(b).getTime()
}

function compareMatchesForScheduling(a: SchedulableMatch, b: SchedulableMatch) {
  const statusPriority: Record<MatchStatus, number> = {
    completed: 0,
    live: 1,
    scheduled: 2,
    cancelled: 3,
  }

  return (
    statusPriority[a.status] - statusPriority[b.status] ||
    compareNullableDate(a.played_at ?? a.scheduled_at, b.played_at ?? b.scheduled_at) ||
    a.matchday - b.matchday ||
    compareNullableDate(a.created_at, b.created_at)
  )
}


function hasDuplicateTeamInMatchday(dayMatches: SchedulableMatch[]) {
  const teamIds = dayMatches.flatMap(match => [match.home_team_id, match.away_team_id])
  return new Set(teamIds).size !== teamIds.length
}

function hasValidMatchdays(matches: SchedulableMatch[], requireTwoMatches = false) {
  const matchdayNumbers = [...new Set(matches.map(match => match.matchday))].sort((a, b) => a - b)
  if (matchdayNumbers.some((matchday, index) => matchday !== index + 1)) return false

  return matchdayNumbers.every(matchday => {
    const dayMatches = matches.filter(match => match.matchday === matchday)
    const cancelledMatches = dayMatches.filter(match => match.status === 'cancelled')

    if (requireTwoMatches) {
      return dayMatches.length === 2 && cancelledMatches.length === 0 && !hasDuplicateTeamInMatchday(dayMatches)
    }

    if (cancelledMatches.length > 0) {
      return dayMatches.length === 1
    }

    return dayMatches.length <= 2 && !hasDuplicateTeamInMatchday(dayMatches)
  })
}

function fixturePairKey(teamId1: string, teamId2: string) {
  return [teamId1, teamId2].sort().join(':')
}

function buildBalancedMatchdayUpdates(matches: SchedulableMatch[], keepCancelledSeparate = true) {
  // 1. Split matches into fixed (completed/live), variable (scheduled/cancelled), and cancelled
  const fixedMatches = matches.filter(match => match.status === 'completed' || match.status === 'live')
    .sort(compareMatchesForScheduling)
  const variableMatches = matches
    .filter(match => match.status !== 'completed' && match.status !== 'live')
    .filter(match => !keepCancelledSeparate || match.status !== 'cancelled')
    .sort(compareMatchesForScheduling)

  // 2. Initialize matchdays structure
  const allMatchdays: SchedulableMatch[][] = []
  
  // 3. Function to assign matches to days sequentially
  function assignMatches(matchesToAssign: SchedulableMatch[]) {
    const remaining = [...matchesToAssign]
    
    while (remaining.length > 0) {
      // Get or create current day
      const currentDayIndex = allMatchdays.length
      let dayMatches = allMatchdays[currentDayIndex]
      if (!dayMatches) {
        dayMatches = []
        allMatchdays.push(dayMatches)
      }
      
      const usedTeams = new Set<string>()
      dayMatches.forEach(m => {
        usedTeams.add(m.home_team_id)
        usedTeams.add(m.away_team_id)
      })
      
      // Try to add matches to current day
      for (let i = remaining.length - 1; i >= 0; i--) {
        const match = remaining[i]
        if (
          dayMatches.length < 2 &&
          !usedTeams.has(match.home_team_id) &&
          !usedTeams.has(match.away_team_id)
        ) {
          dayMatches.push(match)
          usedTeams.add(match.home_team_id)
          usedTeams.add(match.away_team_id)
          remaining.splice(i, 1)
        }
      }
      
      // If no matches added, start a new day
      if (dayMatches.length === allMatchdays[currentDayIndex]?.length) {
        allMatchdays.push([])
      }
    }
  }

  // 4. First assign fixed matches (completed/live)
  assignMatches(fixedMatches)
  
  // 5. Split variable matches into aller and retour phases
  const fixturePairs = new Map<string, SchedulableMatch[]>()
  for (const match of variableMatches) {
    const key = fixturePairKey(match.home_team_id, match.away_team_id)
    fixturePairs.set(key, [...(fixturePairs.get(key) ?? []), match])
  }
  
  const allerMatches: SchedulableMatch[] = []
  const retourMatches: SchedulableMatch[] = []
  for (const pair of fixturePairs.values()) {
    if (pair.length >= 1) allerMatches.push(pair[0])
    if (pair.length >= 2) retourMatches.push(pair[1])
  }
  
  // 6. Assign aller then retour
  assignMatches(allerMatches)
  assignMatches(retourMatches)

  // 7. Add cancelled matches
  if (keepCancelledSeparate) {
    const cancelledMatches = matches
      .filter(match => match.status === 'cancelled')
      .sort(compareMatchesForScheduling)
    
    for (const match of cancelledMatches) {
      allMatchdays.push([match])
    }
  }

  // 8. Filter out empty days and generate updates
  const nonEmptyMatchdays = allMatchdays.filter(day => day.length > 0)
  return nonEmptyMatchdays.flatMap((dayMatches, index) => {
    const matchday = index + 1
    return dayMatches
      .filter(match => match.matchday !== matchday)
      .map(match => ({ id: match.id, matchday }))
  })
}

async function applyBalancedMatchdays(
  seasonId: string,
  knownMatches?: SchedulableMatch[],
  options: MatchdayBalanceOptions = {}
) {
  let matchesToBalance = knownMatches

  if (!matchesToBalance) {
    const { data, error } = await supabase
      .from('matches')
      .select(SCHEDULABLE_MATCH_SELECT)
      .eq('season_id', seasonId)
    if (error) throw error
    matchesToBalance = (data ?? []) as SchedulableMatch[]
  }

  if (hasValidMatchdays(matchesToBalance, options.requireTwoMatches)) return

  const matchdayUpdates = buildBalancedMatchdayUpdates(
    matchesToBalance,
    options.keepCancelledSeparate ?? true
  )
  if (matchdayUpdates.length === 0) return

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

// Convertit une date UTC reçue de la BDD en chaîne locale Benin YYYY-MM-DDTHH:mm (sans décalage DST, toujours UTC+1)
function toBeninInputString(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  // Le Bénin est à UTC+1 de façon constante
  const beninTime = new Date(date.getTime() + 1 * 60 * 60 * 1000)
  return beninTime.toISOString().slice(0, 16)
}

// ── Date editor pour un match ─────────────────────────────────────────────────
function MatchDateEditor({ match }: { match: MatchWithTeams }) {
  const updateMatch = useUpdateMatch()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [scheduledAt, setScheduledAt] = useState(
    toBeninInputString(match.scheduled_at)
  )
  const [homeScore, setHomeScore] = useState(String(match.home_score ?? ''))
  const [awayScore, setAwayScore] = useState(String(match.away_score ?? ''))
  const [status, setStatus] = useState<MatchStatus>(match.status)
  const [eventsReporterId, setEventsReporterId] = useState<string | null>(match.events_reporter_id ?? null)
  const [videoReporterId, setVideoReporterId] = useState<string | null>(match.video_reporter_id ?? null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectingType, setSelectingType] = useState<'events' | 'video' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Charger TOUS les joueurs de la saison pour la délégation
  const { data: seasonPlayers } = usePlayers(match.season_id)

  const selectablePlayers = useMemo((): PlayerWithTeam[] => {
    return (seasonPlayers ?? []).filter(p => 
      p.user_id && 
      p.team_id !== match.home_team_id && 
      p.team_id !== match.away_team_id
    ) // Uniquement les joueurs avec un compte ET pas dans les deux équipes du match
     .sort((a, b) => a.last_name.localeCompare(b.last_name))
  }, [seasonPlayers, match.home_team_id, match.away_team_id])

  const filteredPlayers = useMemo(() => {
    return searchQuery 
      ? selectablePlayers.filter(p => 
          `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : selectablePlayers
  }, [selectablePlayers, searchQuery])

  const home = match.home_team as { name: string; color: string }
  const away = match.away_team as { name: string; color: string }

  function resetFormToMatch() {
    setScheduledAt(toBeninInputString(match.scheduled_at))
    setHomeScore(String(match.home_score ?? ''))
    setAwayScore(String(match.away_score ?? ''))
    setStatus(match.status)
    setEventsReporterId(match.events_reporter_id ?? null)
    setVideoReporterId(match.video_reporter_id ?? null)
    setShowCancelModal(false)
  }

  async function handleSave() {
    // On propose le modal de confirmation dès que le statut est "Annulé"
    // pour permettre à l'admin de choisir s'il veut supprimer les données ou non.
    if (status === 'cancelled') {
      setShowCancelModal(true)
      return
    }

    await performUpdate(false)
  }

  async function performUpdate(deleteInfos: boolean) {
    const shouldRebalanceMatchdays = deleteInfos || status !== match.status

    if (deleteInfos) {
      // 1. Supprimer les polls du match en premier (cascade → predictions, bet_slip_selections)
      const resPolls = await supabase.from('polls').delete().eq('match_id', match.id)
      if (resPolls.error) console.error('Error deleting polls:', resPolls.error)

      // 2. Supprimer les bet_slips qui n'ont plus aucune sélection (orphelins après cascade)
      const resOrphanSlips = await supabase.rpc('delete_empty_bet_slips')
      if (resOrphanSlips.error) console.error('Error deleting orphan bet_slips:', resOrphanSlips.error)

      // 3. Supprimer le reste des données liées au match
      const [resGoals, resAssists, resEvents, resVotes, resFeedback] = await Promise.all([
        supabase.from('goals').delete().eq('match_id', match.id),
        supabase.from('assists').delete().eq('match_id', match.id),
        supabase.from('match_events').delete().eq('match_id', match.id),
        supabase.from('mvp_votes').delete().eq('match_id', match.id),
        supabase.from('match_feedback').delete().eq('match_id', match.id),
      ])

      if (resGoals.error) console.error('Error deleting goals:', resGoals.error)
      if (resAssists.error) console.error('Error deleting assists:', resAssists.error)
      if (resEvents.error) console.error('Error deleting events:', resEvents.error)
      if (resVotes.error) console.error('Error deleting votes:', resVotes.error)
      if (resFeedback.error) console.error('Error deleting feedback:', resFeedback.error)

      await updateMatch.mutateAsync({
        id: match.id,
        status: 'cancelled',
        home_score: null,
        away_score: null,
        scheduled_at: null,
        played_at: null,
        events_reporter_id: null,
        video_reporter_id: null,
      })
    } else {
      await updateMatch.mutateAsync({
        id: match.id,
        scheduled_at: scheduledAt ? new Date(scheduledAt + '+01:00').toISOString() : null,
        home_score: homeScore !== '' ? parseInt(homeScore) : null,
        away_score: awayScore !== '' ? parseInt(awayScore) : null,
        status,
        played_at: status === 'completed' ? (match.played_at ?? new Date().toISOString()) : match.played_at,
        events_reporter_id: eventsReporterId,
        video_reporter_id: videoReporterId,
      })
    }

    if (shouldRebalanceMatchdays) {
      await applyBalancedMatchdays(match.season_id)
      qc.invalidateQueries({ queryKey: ['matches', match.season_id] })
      qc.invalidateQueries({ queryKey: ['standings', match.season_id] })
    }

    setEditing(false)
    setShowCancelModal(false)
    resetFormToMatch()
  }

  const dateLabel = match.scheduled_at
    ? new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(match.scheduled_at))
    : 'À venir'

  return (
    <div className="border-b border-surface-border/40 last:border-b-0 hover:bg-surface-raised/30 transition-all duration-300 group/match">
      {/* Match row */}
      <div className="flex items-center gap-3 px-4 py-3 relative z-10">
        {/* Home */}
        <div className="flex items-center justify-end gap-2.5 flex-1 min-w-0">
          <span className="text-sm font-black text-text-primary uppercase tracking-wide truncate transition-colors group-hover/match:text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{home.name}</span>
          <span className="w-1.5 h-6 rounded-full shrink-0 shadow-sm opacity-80" style={{ backgroundColor: home.color }} />
        </div>

        {/* Score / date */}
        <div className="shrink-0 text-center min-w-22.5 px-2">
          {match.status === 'completed' ? (
            <span className="text-2xl font-black tabular-nums text-text-primary tracking-tighter" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
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
          <span className="w-1.5 h-6 rounded-full shrink-0 shadow-sm opacity-80" style={{ backgroundColor: away.color }} />
          <span className="text-sm font-black text-text-primary uppercase tracking-wide truncate transition-colors group-hover/match:text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>{away.name}</span>
        </div>

        {/* Delegation Badges */}
        <div className="hidden sm:flex items-center gap-1.5 px-2">
          {match.events_reporter_id && (
            <div className="w-5 h-5 rounded-full bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-500" title="Rapporteur événements assigné">
              <Zap size={10} />
            </div>
          )}
          {match.video_reporter_id && (
            <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500" title="Rapporteur vidéo assigné">
              <Calendar size={10} />
            </div>
          )}
        </div>

        {/* Edit button */}
        <button
          onClick={() => setEditing(!editing)}
          className="text-slate-500 hover:text-text-primary bg-surface-raised/40 hover:bg-surface-raised p-2.5 rounded-xl shrink-0 transition-all border border-surface-border/50 hover:scale-105 active:scale-95"
        >
          <Pencil size={13} />
        </button>
      </div>

      {/* Edit panel */}
      {editing && (
        <div className="px-5 pb-6 pt-2 space-y-6 bg-surface-raised/20 border-t border-surface-border/30 relative overflow-hidden animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Date & heure</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="input text-sm py-2.5 bg-surface/40 border-surface-border/50 focus:border-primary-500/50"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Score (dom – ext)</label>
              <div className="flex items-center gap-2">
                <input type="number" value={homeScore} onChange={e => setHomeScore(e.target.value)}
                  className="input text-base font-black tabular-nums py-2 text-center bg-surface/50 border-surface-border" min={0} placeholder="0" style={{ fontFamily: "'Barlow Condensed', sans-serif" }} />
                <span className="text-slate-500 shrink-0 font-bold">–</span>
                <input type="number" value={awayScore} onChange={e => setAwayScore(e.target.value)}
                  className="input text-base font-black tabular-nums py-2 text-center bg-surface/50 border-surface-border" min={0} placeholder="0" style={{ fontFamily: "'Barlow Condensed', sans-serif" }} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Statut</label>
              <select value={status} onChange={e => setStatus(e.target.value as MatchStatus)}
                className="input text-sm py-2.5 bg-surface/40 border-surface-border/50">
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Délégation Section */}
          <div className="pt-4 border-t border-surface-border/50">
            <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <ShieldCheck size={12} className="text-primary-500" />
              Délégation des accès Live
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bouton Rapporteur Événements */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Rapporteur Événements</label>
                <button
                  type="button"
                  onClick={() => setSelectingType('events')}
                  className={clsx(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
                    eventsReporterId 
                      ? "bg-primary-500/5 border-primary-500/30 text-text-primary" 
                      : "bg-surface/50 border-surface-border text-text-muted hover:border-slate-500"
                  )}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className={clsx("p-1.5 rounded-lg", eventsReporterId ? "bg-primary-500/20 text-primary-500" : "bg-slate-500/10")}>
                      <Zap size={14} />
                    </div>
                    <div className="truncate">
                      <p className="text-[11px] font-black uppercase tracking-wider truncate">
                        {selectablePlayers.find(p => p.user_id === eventsReporterId) 
                          ? `${selectablePlayers.find(p => p.user_id === eventsReporterId)?.first_name} ${selectablePlayers.find(p => p.user_id === eventsReporterId)?.last_name}`
                          : "Non assigné"}
                      </p>
                      {eventsReporterId && (
                        <p className="text-[8px] font-bold text-text-muted uppercase tracking-widest">Cliquez pour modifier</p>
                      )}
                    </div>
                  </div>
                  {eventsReporterId && (
                    <X 
                      size={14} 
                      className="text-text-muted hover:text-red-500 transition-colors" 
                      onClick={(e) => { e.stopPropagation(); setEventsReporterId(null); }}
                    />
                  )}
                </button>
              </div>

              {/* Bouton Rapporteur Vidéo */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 block">Rapporteur Vidéo</label>
                <button
                  type="button"
                  onClick={() => setSelectingType('video')}
                  className={clsx(
                    "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left",
                    videoReporterId 
                      ? "bg-blue-500/5 border-blue-500/30 text-text-primary" 
                      : "bg-surface/50 border-surface-border text-text-muted hover:border-slate-500"
                  )}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className={clsx("p-1.5 rounded-lg", videoReporterId ? "bg-blue-500/20 text-blue-500" : "bg-slate-500/10")}>
                      <Video size={14} />
                    </div>
                    <div className="truncate">
                      <p className="text-[11px] font-black uppercase tracking-wider truncate">
                        {selectablePlayers.find(p => p.user_id === videoReporterId) 
                          ? `${selectablePlayers.find(p => p.user_id === videoReporterId)?.first_name} ${selectablePlayers.find(p => p.user_id === videoReporterId)?.last_name}`
                          : "Non assigné"}
                      </p>
                      {videoReporterId && (
                        <p className="text-[8px] font-bold text-text-muted uppercase tracking-widest">Cliquez pour modifier</p>
                      )}
                    </div>
                  </div>
                  {videoReporterId && (
                    <X 
                      size={14} 
                      className="text-text-muted hover:text-red-500 transition-colors" 
                      onClick={(e) => { e.stopPropagation(); setVideoReporterId(null); }}
                    />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={updateMatch.isPending}
              className="btn-primary text-xs font-bold uppercase tracking-wider py-2 px-4 flex items-center gap-1.5">
              {updateMatch.isPending ? <LoadingSpinner size="sm" /> : <Check size={14} />}
              Enregistrer
            </button>
            <button onClick={() => { setEditing(false); resetFormToMatch() }} className="btn-secondary py-2 px-3 bg-surface-raised border border-surface-border hover:bg-surface-raised/80">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modals — Déplacés à la racine du composant pour éviter les problèmes de clipping et z-index */}
      {showCancelModal && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setShowCancelModal(false)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-sm bg-surface-card border border-surface-border rounded-3xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-6 text-red-500">
              <X size={32} />
            </div>
            
            <h3 className="text-2xl font-black text-text-primary uppercase tracking-widest mb-3 text-center" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Annuler le match ?
            </h3>
            
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8 text-center leading-relaxed">
              Voulez-vous conserver les statistiques (buts, cartons) ou tout supprimer définitivement ?
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => performUpdate(false)}
                className="w-full py-3.5 rounded-2xl bg-surface-raised border border-surface-border text-text-primary text-[11px] font-black uppercase tracking-widest hover:bg-surface-raised/80 transition-all active:scale-95"
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

      {selectingType && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setSelectingType(null)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-surface border border-surface-border rounded-[2.5rem] flex flex-col max-h-[80vh] shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-in zoom-in-95 duration-300 overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 border-b border-surface-border/30 bg-surface-raised/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                    selectingType === 'events' ? "bg-primary-500/10 text-primary-500" : "bg-blue-500/10 text-blue-500"
                  )}>
                    {selectingType === 'events' ? <Zap size={22} /> : <Video size={22} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-text-primary uppercase tracking-tight leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      Choisir un rapporteur
                    </h3>
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1 opacity-70">
                      {selectingType === 'events' ? "Événements du match" : "Direct Vidéo"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectingType(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-raised text-text-muted transition-all active:scale-90"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Search Input */}
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary-500 transition-colors pointer-events-none">
                  <Search size={18} />
                </div>
                <input 
                  autoFocus
                  type="text"
                  placeholder="Rechercher un joueur..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-raised/50 border border-surface-border rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold text-text-primary focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/50 outline-none transition-all placeholder:text-text-muted/40"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-surface">
              <div className="grid grid-cols-1 gap-2">
                {/* Option: Aucun */}
                <button
                  onClick={() => {
                    if (selectingType === 'events') setEventsReporterId(null);
                    else setVideoReporterId(null);
                    setSelectingType(null);
                  }}
                  className={clsx(
                    "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group",
                    ((selectingType === 'events' && !eventsReporterId) || (selectingType === 'video' && !videoReporterId))
                      ? "bg-primary-500/5 border-primary-500/30 text-text-primary"
                      : "bg-surface-raised/30 border-transparent text-text-muted hover:bg-surface-raised/60 hover:border-surface-border"
                  )}
                >
                  <div className={clsx(
                    "w-11 h-11 rounded-full flex items-center justify-center transition-all",
                    ((selectingType === 'events' && !eventsReporterId) || (selectingType === 'video' && !videoReporterId))
                      ? "bg-primary-500/20 text-primary-500"
                      : "bg-surface-muted/50 text-text-muted/40"
                  )}>
                    <User size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black uppercase tracking-widest leading-none">Aucun</p>
                    <p className="text-[9px] font-bold text-text-muted uppercase tracking-widest mt-1 opacity-60">Admin uniquement</p>
                  </div>
                  {((selectingType === 'events' && !eventsReporterId) || (selectingType === 'video' && !videoReporterId)) && (
                    <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
                      <Check size={14} strokeWidth={3} />
                    </div>
                  )}
                </button>

                <div className="h-px bg-surface-border/30 my-2 mx-4" />

                {/* Players */}
                {filteredPlayers.length > 0 ? (
                  filteredPlayers.map(player => {
                    const isSelected = selectingType === 'events' 
                      ? eventsReporterId === player.user_id 
                      : videoReporterId === player.user_id;
                    
                    return (
                      <button
                        key={player.id}
                        onClick={() => {
                          if (selectingType === 'events') setEventsReporterId(player.user_id!);
                          else setVideoReporterId(player.user_id!);
                          setSelectingType(null);
                          setSearchQuery('');
                        }}
                        className={clsx(
                          "flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group",
                          isSelected
                            ? "bg-primary-500/5 border-primary-500/30 text-text-primary shadow-sm"
                            : "bg-transparent border-transparent text-text-muted hover:bg-surface-raised/50"
                        )}
                      >
                        <div className="relative shrink-0">
                          <div className={clsx(
                            "w-11 h-11 rounded-full flex items-center justify-center overflow-hidden border-2 transition-all",
                            isSelected ? "border-primary-500" : "border-surface-border group-hover:border-surface-border/80"
                          )}>
                            {player.avatar_url ? (
                              <img src={player.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-surface-muted flex items-center justify-center">
                                <span className="text-[13px] font-black uppercase tracking-tighter">{player.first_name[0]}{player.last_name[0]}</span>
                              </div>
                            )}
                          </div>
                          <div 
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-surface"
                            style={{ backgroundColor: player.teams?.color }}
                          />
                        </div>
                        <div className="flex-1 truncate">
                          <p className={clsx(
                            "text-[12px] font-black uppercase tracking-tight leading-none truncate",
                            isSelected ? "text-primary-500" : "text-text-primary"
                          )}>
                            {player.first_name} {player.last_name}
                          </p>
                          <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.15em] mt-1.5 opacity-70">
                            {player.teams?.name}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="py-16 text-center opacity-40">
                    <Search size={40} className="mx-auto mb-4" strokeWidth={1.5} />
                    <p className="text-[11px] font-black text-text-muted uppercase tracking-widest">Aucun joueur trouvé</p>
                  </div>
                )}
              </div>
            </div>
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
        const { data, error } = await (supabase.from('matches') as any)
          .insert(allMatchesToCreate as any)
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
            (supabase.from('matches') as any)
              .update({
                status: 'scheduled',
                home_score: null,
                away_score: null,
                played_at: null,
              } as any)
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
            (supabase.from('matches') as any)
              .update({ matchday: update.matchday } as any)
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
