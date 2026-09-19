import { useEffect, useMemo } from 'react'
import { X as XIcon, ChevronRight, UserCheck, ClipboardList, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PitchView } from '@/components/matches/MatchLineups'
import { useMatchLineups } from '@/hooks/useLineups'
import type { MatchWithTeams } from '@/hooks/useMatches'

export function LineupHistoryDrawer({
  match,
  teamId,
  teamColor,
  onClose,
}: {
  match: MatchWithTeams
  teamId: string
  teamColor: string
  onClose: () => void
}) {
  const { data: lineups, isLoading } = useMatchLineups(match.id)

  const teamLineup = useMemo(() => {
    return (lineups ?? []).filter(l => l.team_id === teamId)
  }, [lineups, teamId])

  const starters = teamLineup.filter(l => l.is_starter)
  const subs = teamLineup.filter(l => !l.is_starter)

  const formation = useMemo(() => {
    const firstPos = starters.find(l => l.position?.includes(':'))?.position
    return firstPos?.split(':')[0] || '2-1-1'
  }, [starters])

  const isHome = match.home_team_id === teamId
  const opp = isHome ? match.away_team : match.home_team
  const myScore = isHome ? match.home_score : match.away_score
  const oppScore = isHome ? match.away_score : match.home_score
  const result: 'W' | 'D' | 'L' | null =
    myScore !== null && oppScore !== null
      ? myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D'
      : null

  // Ferme avec Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Bloque le scroll body
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div
        className="relative w-full sm:max-w-lg max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden animate-fade-in-up"
        style={{ backgroundColor: 'var(--color-surface-card)', border: '1px solid var(--color-surface-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--color-surface-border)' }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[9px] font-black text-primary-500 uppercase tracking-widest">J{match.matchday}</span>
              <p className="text-sm font-black text-text-primary truncate">
                {isHome ? 'vs' : '@'} {opp.name}
              </p>
              {result && (
                <span className={clsx(
                  'text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider',
                  result === 'W' ? 'bg-green-500/20 text-green-400' :
                    result === 'L' ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-500/20 text-text-secondary'
                )}>
                  {myScore}–{oppScore}
                </span>
              )}
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">
              {match.played_at
                ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }).format(new Date(match.played_at))
                : '—'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors shrink-0"
            aria-label="Fermer"
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : teamLineup.length === 0 ? (
            <Card className="p-0 overflow-hidden">
              <EmptyState
                icon={<ClipboardList />}
                title="Aucune composition"
                description="Aucune compo n'a été soumise pour ce match."
                className="py-12"
              />
            </Card>
          ) : (
            <>
              {/* Formation + pitch */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                    Formation · {formation}
                  </p>
                  <span className="text-[10px] font-black text-text-secondary bg-white/5 px-2 py-0.5 rounded-lg border border-white/5">
                    {starters.length} titulaires · {subs.length} remplaçants
                  </span>
                </div>
                <PitchView
                  players={starters}
                  teamColor={teamColor}
                  formation={formation}
                  className="aspect-3/4 max-h-64"
                />
              </div>

              {/* Liste titulaires */}
              {starters.length > 0 && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="flex items-center gap-1.5 px-3 py-2"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <UserCheck size={12} className="text-primary-400" />
                    <p className="text-xs font-black text-text-secondary uppercase tracking-wider">
                      Titulaires ({starters.length})
                    </p>
                  </div>
                  {starters.map((l, i) => (
                    <div
                      key={l.id}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2.5',
                        i < starters.length - 1 && 'border-b border-white/4'
                      )}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0"
                        style={{ backgroundColor: teamColor }}
                      >
                        {l.jersey_number ?? '—'}
                      </div>
                      <p className="text-sm text-text-primary font-medium flex-1 truncate">
                        {l.player ? `${l.player.first_name} ${l.player.last_name}` : '—'}
                      </p>
                      {l.position && (
                        <span className="text-[9px] font-black text-text-muted uppercase tracking-wider shrink-0">
                          {l.position.includes(':') ? l.position.split(':')[1] : l.position}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Liste remplaçants */}
              {subs.length > 0 && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="flex items-center gap-1.5 px-3 py-2"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <Users size={12} className="text-blue-400" />
                    <p className="text-xs font-black text-text-secondary uppercase tracking-wider">
                      Remplaçants ({subs.length})
                    </p>
                  </div>
                  {subs.map((l, i) => (
                    <div
                      key={l.id}
                      className={clsx(
                        'flex items-center gap-3 px-3 py-2.5',
                        i < subs.length - 1 && 'border-b border-white/4'
                      )}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0 opacity-60"
                        style={{ backgroundColor: teamColor }}
                      >
                        {l.jersey_number ?? '—'}
                      </div>
                      <p className="text-sm text-text-secondary font-medium flex-1 truncate">
                        {l.player ? `${l.player.first_name} ${l.player.last_name}` : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Lien vers le match */}
              <Link
                to={`/matches/${match.slug || match.id}`}
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/3 border border-white/5 text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-text-primary hover:bg-white/5 transition-all"
              >
                <ChevronRight size={13} />
                Voir le match complet
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
