/**
 * PlayoffsPage — Bracket de phase finale
 * Génération automatique depuis le classement + gestion des matchs admin
 */

import { useState } from 'react'
import { Trophy, Zap, Lock, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useSettings } from '@/hooks/useSettings'
import { useStandings } from '@/hooks/useStandings'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'
import type { MatchStatus } from '@/types/database'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PlayoffMatch {
  id: string
  slug: string | null
  season_id: string
  home_team_id: string | null
  away_team_id: string | null
  home_score: number | null
  away_score: number | null
  status: MatchStatus
  matchday: number        // utilisé comme round (100=QF, 101=SF, 102=F)
  scheduled_at: string | null
  home_team?: { id: string; name: string; color: string; logo_url: string | null } | null
  away_team?: { id: string; name: string; color: string; logo_url: string | null } | null
}

interface Round {
  label: string
  matchday: number
  matches: PlayoffMatch[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes matchday pour les rounds playoffs
// ─────────────────────────────────────────────────────────────────────────────
const PLAYOFF_MATCHDAY_START = 100  // 100=QF, 101=SF, 102=Finale

function getRoundLabel(matchday: number, totalRounds: number): string {
  const roundIndex = matchday - PLAYOFF_MATCHDAY_START
  if (roundIndex === totalRounds - 1) return 'Finale'
  if (roundIndex === totalRounds - 2) return 'Demi-finales'
  if (roundIndex === totalRounds - 3) return 'Quarts de finale'
  return `Tour ${roundIndex + 1}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook — matchs playoffs
// ─────────────────────────────────────────────────────────────────────────────

function usePlayoffMatches(seasonId?: string) {
  return useQuery({
    queryKey: ['playoff-matches', seasonId],
    enabled: !!seasonId,
    staleTime: 30_000,
    queryFn: async (): Promise<PlayoffMatch[]> => {
      const { data, error } = await (supabase.from('matches') as any)
        .select(`
          id, slug, season_id, home_team_id, away_team_id,
          home_score, away_score, status, matchday, scheduled_at,
          home_team:teams!home_team_id(id, name, color, logo_url),
          away_team:teams!away_team_id(id, name, color, logo_url)
        `)
        .eq('season_id', seasonId!)
        .gte('matchday', PLAYOFF_MATCHDAY_START)
        .order('matchday', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data ?? []) as unknown as PlayoffMatch[]
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook — générer le bracket
// ─────────────────────────────────────────────────────────────────────────────

function useGeneratePlayoffs(seasonId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      qualifiedTeams,
    }: {
      qualifiedTeams: Array<{ id: string; name: string; color: string }>
    }) => {
      if (!seasonId) throw new Error('Pas de saison active')
      const n = qualifiedTeams.length
      // Nombre de rounds = log2(n)
      const rounds = Math.ceil(Math.log2(n))

      // Supprimer les anciens matchs playoffs
      await supabase
        .from('matches')
        .delete()
        .eq('season_id', seasonId)
        .gte('matchday', PLAYOFF_MATCHDAY_START)

      // Créer les matchs du premier tour (têtes de série vs derniers)
      // Seeding : 1 vs n, 2 vs n-1, etc.
      const firstRoundMatches = []
      for (let i = 0; i < n / 2; i++) {
        firstRoundMatches.push({
          season_id: seasonId,
          home_team_id: qualifiedTeams[i].id,
          away_team_id: qualifiedTeams[n - 1 - i].id,
          matchday: PLAYOFF_MATCHDAY_START,
          status: 'scheduled' as MatchStatus,
          home_score: null,
          away_score: null,
        })
      }
      const { error: e1 } = await (supabase.from('matches') as any).insert(firstRoundMatches)
      if (e1) throw e1

      // Créer les matchs des rounds suivants (sans équipes — à remplir après)
      for (let r = 1; r < rounds; r++) {
        const matchesInRound = n / Math.pow(2, r + 1)
        const roundMatches = Array.from({ length: matchesInRound }, () => ({
          season_id: seasonId,
          home_team_id: null,
          away_team_id: null,
          matchday: PLAYOFF_MATCHDAY_START + r,
          status: 'scheduled' as MatchStatus,
          home_score: null,
          away_score: null,
        }))
        if (roundMatches.length > 0) {
          const { error: e2 } = await (supabase.from('matches') as any).insert(roundMatches)
          if (e2) throw e2
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playoff-matches', seasonId] })
      qc.invalidateQueries({ queryKey: ['matches', seasonId] })
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook — avancer le vainqueur au prochain tour
// ─────────────────────────────────────────────────────────────────────────────

function useAdvanceWinner(seasonId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      match,
      nextRoundMatchday,
      slotIndex,
    }: {
      match: PlayoffMatch
      nextRoundMatchday: number
      slotIndex: number  // 0 = home slot, 1 = away slot du prochain match
    }) => {
      if (!match.home_team_id || !match.away_team_id) return
      const winnerId =
        (match.home_score ?? 0) > (match.away_score ?? 0)
          ? match.home_team_id
          : match.away_team_id

      // Trouver le prochain match à remplir
      const { data: nextMatches } = await (supabase.from('matches') as any)
        .select('id, home_team_id, away_team_id')
        .eq('season_id', seasonId!)
        .eq('matchday', nextRoundMatchday)
        .order('created_at', { ascending: true })

      if (!nextMatches?.length) return
      const targetMatch = nextMatches[Math.floor(slotIndex / 2)]
      if (!targetMatch) return

      const update = slotIndex % 2 === 0
        ? { home_team_id: winnerId }
        : { away_team_id: winnerId }

      await (supabase.from('matches') as any).update(update).eq('id', targetMatch.id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playoff-matches', seasonId] })
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// MatchCard — carte d'un match de playoff
// ─────────────────────────────────────────────────────────────────────────────

function PlayoffMatchCard({
  match,
  isAdmin,
  onAdvance,
  canAdvance,
}: {
  match: PlayoffMatch
  isAdmin: boolean
  onAdvance?: () => void
  canAdvance: boolean
}) {
  const home = match.home_team
  const away = match.away_team
  const isCompleted = match.status === 'completed'
  const isLive = match.status === 'live'
  const isTBD = !home || !away

  const homeWon = isCompleted && (match.home_score ?? 0) > (match.away_score ?? 0)
  const awayWon = isCompleted && (match.away_score ?? 0) > (match.home_score ?? 0)

  return (
    <div className={clsx(
      'relative rounded-2xl border overflow-hidden transition-all',
      isLive
        ? 'border-red-500/40 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
        : isCompleted
          ? 'border-white/10 bg-white/[0.02]'
          : 'border-white/8 bg-black/20',
    )}>
      {isLive && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/30">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">Live</span>
        </div>
      )}

      {/* Équipe domicile */}
      <TeamRow
        team={home ?? null}
        score={isCompleted || isLive ? match.home_score : null}
        isWinner={homeWon}
        isTBD={isTBD}
      />

      {/* Séparateur */}
      <div className="h-px bg-white/5 mx-3" />

      {/* Équipe extérieur */}
      <TeamRow
        team={away ?? null}
        score={isCompleted || isLive ? match.away_score : null}
        isWinner={awayWon}
        isTBD={isTBD}
      />

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-white/5">
        {match.scheduled_at ? (
          <span className="text-[10px] text-slate-600 font-bold">
            {new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
              .format(new Date(match.scheduled_at))}
          </span>
        ) : (
          <span className="text-[10px] text-slate-700 font-bold uppercase tracking-wider">À programmer</span>
        )}

        <div className="flex items-center gap-2">
          {isCompleted && canAdvance && isAdmin && (
            <button
              onClick={onAdvance}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-600/20 border border-primary-500/30 text-primary-400 text-[9px] font-black uppercase tracking-wider hover:bg-primary-600/30 transition-colors"
            >
              <ChevronRight size={10} />
              Avancer
            </button>
          )}
          {(isCompleted || isLive) && (
            <Link
              to={`/matches/${match.slug || match.id}`}
              className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-wider transition-colors"
            >
              Détails →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function TeamRow({
  team, score, isWinner, isTBD,
}: {
  team: { id: string; name: string; color: string; logo_url: string | null } | null
  score: number | null | undefined
  isWinner: boolean
  isTBD: boolean
}) {
  return (
    <div className={clsx(
      'flex items-center gap-3 px-3 py-2.5',
      isWinner && 'bg-white/[0.03]',
    )}>
      {/* Logo / couleur */}
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0 overflow-hidden"
        style={{ backgroundColor: team?.color ?? '#334155' }}
      >
        {team?.logo_url
          ? <img src={team.logo_url} alt={team.name} className="w-full h-full object-contain" />
          : team ? team.name[0] : '?'
        }
      </div>

      {/* Nom */}
      <span className={clsx(
        'flex-1 text-sm font-bold truncate',
        isTBD ? 'text-slate-600 italic' : isWinner ? 'text-white' : 'text-slate-400',
      )}>
        {team ? team.name : 'À déterminer'}
      </span>

      {/* Score */}
      {score !== null && score !== undefined && (
        <span className={clsx(
          'text-lg font-black tabular-nums w-6 text-center',
          isWinner ? 'text-white' : 'text-slate-500',
        )} style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          {score}
        </span>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────────────────────

export function PlayoffsPage() {
  const { isAdmin } = useAuth()
  const { data: season } = useActiveSeason()
  const { data: settings } = useSettings(season?.id)
  const { data: standings = [] } = useStandings(season?.id)
  const { data: playoffMatches = [], isLoading } = usePlayoffMatches(season?.id)
  const generatePlayoffs = useGeneratePlayoffs(season?.id)
  const advanceWinner = useAdvanceWinner(season?.id)
  const [showGenConfirm, setShowGenConfirm] = useState(false)

  const playoffEnabled = settings?.playoff_enabled ?? false
  const teamsInPlayoff = settings?.teams_in_playoff ?? 4

  // Équipes qualifiées (top N du classement)
  const qualifiedTeams = standings.slice(0, teamsInPlayoff).map(s => ({
    id: s.team_id,
    name: s.team_name,
    color: s.team_color,
  }))

  // Organiser les matchs par round
  const matchdays = [...new Set(playoffMatches.map(m => m.matchday))].sort((a, b) => a - b)
  const totalRounds = matchdays.length || Math.ceil(Math.log2(teamsInPlayoff))

  const rounds: Round[] = matchdays.map(md => ({
    label: getRoundLabel(md, totalRounds),
    matchday: md,
    matches: playoffMatches.filter(m => m.matchday === md),
  }))

  const hasPlayoffs = playoffMatches.length > 0

  if (!playoffEnabled) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center">
          <Lock size={24} className="text-slate-500" />
        </div>
        <h2 className="text-xl font-black text-white uppercase tracking-wider">Phase finale désactivée</h2>
        <p className="text-slate-500 text-sm max-w-xs">
          Les playoffs ne sont pas activés pour cette saison.
          {isAdmin && ' Activez-les dans les paramètres admin.'}
        </p>
        {isAdmin && (
          <Link to="/admin?tab=settings" className="btn-primary text-xs font-bold uppercase tracking-wider py-2 px-5 mt-2">
            Paramètres
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">

      {/* Modale confirmation génération */}
      {showGenConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowGenConfirm(false)} />
          <div className="relative w-full max-w-sm bg-[#0f1420] border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center mx-auto mb-5">
              <Trophy size={24} className="text-primary-400" />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2 text-center"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {hasPlayoffs ? 'Regénérer le bracket ?' : 'Générer le bracket ?'}
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6 text-center leading-relaxed">
              {teamsInPlayoff} équipes qualifiées · {Math.ceil(Math.log2(teamsInPlayoff))} tours
              {hasPlayoffs && <span className="block mt-1 text-red-400">Les matchs existants seront supprimés.</span>}
            </p>
            <div className="space-y-2">
              {qualifiedTeams.map((t, i) => (
                <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] font-black text-slate-500 w-4">#{i + 1}</span>
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.color }} />
                  <span className="text-xs font-bold text-white">{t.name}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 mt-6">
              <button
                onClick={() => { setShowGenConfirm(false); generatePlayoffs.mutate({ qualifiedTeams }) }}
                disabled={generatePlayoffs.isPending}
                className="w-full py-3 rounded-2xl bg-primary-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-primary-500 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {generatePlayoffs.isPending ? <LoadingSpinner size="sm" /> : <Zap size={14} />}
                Confirmer
              </button>
              <button onClick={() => setShowGenConfirm(false)} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors mt-1">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 p-6"
        style={{ background: 'var(--card-bg, linear-gradient(135deg, #1a1200 0%, #0f1420 60%, #0a0d1a 100%))' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 10% 50%, rgba(245,158,11,0.08) 0%, transparent 70%)' }} />
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-amber-500 to-transparent" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Trophy size={22} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-wider"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                Phase Finale
              </h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                {teamsInPlayoff} équipes · {settings?.playoff_format === 'two_legs' ? 'Aller-retour' : 'Match unique'}
                {season && <span className="text-amber-500/60 ml-2">— {season.name}</span>}
              </p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowGenConfirm(true)}
              disabled={qualifiedTeams.length < 2 || generatePlayoffs.isPending}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all',
                qualifiedTeams.length >= 2
                  ? 'bg-primary-600 text-white hover:bg-primary-500 shadow-[0_0_15px_rgba(200,241,53,0.2)]'
                  : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5',
              )}
            >
              {generatePlayoffs.isPending ? <LoadingSpinner size="sm" /> : <Zap size={14} />}
              {hasPlayoffs ? 'Regénérer' : 'Générer le bracket'}
            </button>
          )}
        </div>
      </div>

      {/* Équipes qualifiées */}
      {standings.length > 0 && (
        <div className="card">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
            Équipes qualifiées — Top {teamsInPlayoff}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {qualifiedTeams.map((team, i) => (
              <div key={team.id} className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/8 bg-white/[0.02]">
                <span className="text-[10px] font-black text-slate-600 w-4 shrink-0">#{i + 1}</span>
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: team.color }} />
                <span className="text-xs font-bold text-white truncate">{team.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bracket */}
      {isLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : !hasPlayoffs ? (
        <div className="card text-center py-16 border border-white/8">
          <Trophy size={32} className="mx-auto mb-4 text-slate-700" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Bracket non généré</p>
          <p className="text-slate-600 text-xs">
            {isAdmin
              ? 'Cliquez sur "Générer le bracket" pour créer les matchs de phase finale.'
              : 'Le bracket sera disponible une fois la phase de groupes terminée.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {rounds.map((round) => {
            const nextRoundMatchday = round.matchday + 1
            const hasNextRound = matchdays.includes(nextRoundMatchday)

            return (
              <div key={round.matchday} className="space-y-3">
                {/* Header du round */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/8" />
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                    {round.label === 'Finale' && <Trophy size={12} className="text-amber-400" />}
                    <span className="text-xs font-black text-white uppercase tracking-widest">{round.label}</span>
                    <span className="text-[10px] text-slate-600 font-bold">
                      {round.matches.filter(m => m.status === 'completed').length}/{round.matches.length}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-white/8" />
                </div>

                {/* Matchs du round */}
                <div className={clsx(
                  'grid gap-3',
                  round.matches.length === 1 ? 'max-w-sm mx-auto' :
                    round.matches.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
                      'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
                )}>
                  {round.matches.map((match, matchIdx) => (
                    <PlayoffMatchCard
                      key={match.id}
                      match={match}
                      isAdmin={isAdmin}
                      canAdvance={hasNextRound && match.status === 'completed'}
                      onAdvance={() => advanceWinner.mutate({
                        match,
                        nextRoundMatchday,
                        slotIndex: matchIdx,
                      })}
                    />
                  ))}
                </div>

                {/* Vainqueur final */}
                {round.label === 'Finale' && round.matches[0]?.status === 'completed' && (() => {
                  const final = round.matches[0]
                  const winnerId = (final.home_score ?? 0) > (final.away_score ?? 0)
                    ? final.home_team_id : final.away_team_id
                  const winner = winnerId === final.home_team_id ? final.home_team : final.away_team
                  if (!winner) return null
                  return (
                    <div className="flex flex-col items-center gap-3 py-6">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-2xl overflow-hidden"
                        style={{ backgroundColor: winner.color }}>
                        {winner.logo_url
                          ? <img src={winner.logo_url} alt={winner.name} className="w-full h-full object-contain" />
                          : winner.name[0]
                        }
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">🏆 Champion</p>
                        <p className="text-2xl font-black text-white uppercase tracking-wider"
                          style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                          {winner.name}
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
