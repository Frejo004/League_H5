import { BarChart2, Check, X, Star, Lock } from 'lucide-react'
import { usePollsByMatch, usePoll } from '@/hooks/usePolls'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useState } from 'react'
import clsx from 'clsx'

// ── PollItem inline (sans requête séparée par poll) ───────────────────────────
function MatchPollItem({ pollId }: { pollId: string }) {
  const { poll, predictions, userPrediction, vote } = usePoll(pollId)
  const [voting, setVoting] = useState(false)

  if (poll.isLoading || !poll.data) return null

  const p = poll.data
  const totalVotes = predictions.data?.length ?? 0
  const votesByOption = p.options.map((_, idx) =>
    predictions.data?.filter(v => v.option_index === idx).length ?? 0
  )

  const isActive   = p.status === 'active'
  const isResolved = p.status === 'completed' && p.correct_option_index != null
  const showPct    = !isActive || !!userPrediction.data

  const userVote   = userPrediction.data
  const userWon    = isResolved && userVote?.is_correct === true

  async function handleVote(idx: number) {
    if (!isActive || voting) return
    setVoting(true)
    try { await vote.mutateAsync({ optionIndex: idx }) }
    finally { setVoting(false) }
  }

  return (
    <div className="space-y-2">
      {/* Question */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-text-primary">{p.question}</p>
        <div className="flex items-center gap-1.5 shrink-0">
          {isResolved && userVote && (
            <span className={clsx(
              'flex items-center gap-1 text-[10px] font-bold uppercase',
              userWon ? 'text-green-400' : 'text-slate-500'
            )}>
              {userWon
                ? <><Star size={9} fill="currentColor" /> +{userVote.points_earned} pts</>
                : <><X size={9} /> Raté</>
              }
            </span>
          )}
          {!isActive && !isResolved && (
            <span className="flex items-center gap-1 text-[10px] text-yellow-500 font-bold uppercase">
              <Lock size={9} /> Fermé
            </span>
          )}
          <span className="text-[10px] text-text-muted">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Options style paris sportif */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${Math.min(p.options.length, 3)}, 1fr)` }}>
        {p.options.map((option: string, idx: number) => {
          const votes      = votesByOption[idx]
          const pct        = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
          const isMyChoice = userVote?.option_index === idx
          const isCorrect  = isResolved && p.correct_option_index === idx
          const isWrong    = isResolved && isMyChoice && !isCorrect

          return (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              disabled={!isActive || voting}
              className={clsx(
                'relative flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border transition-all overflow-hidden',
                'text-center font-bold text-xs',
                isCorrect
                  ? 'bg-green-500/15 border-green-500/40 text-green-400'
                  : isWrong
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : isMyChoice
                      ? 'bg-primary-500/15 border-primary-500/40 text-primary-400'
                      : isActive
                        ? 'bg-surface-raised border-surface-border text-text-primary hover:border-primary-500/40 hover:bg-primary-500/5 cursor-pointer'
                        : 'bg-surface-raised border-surface-border text-text-muted cursor-default'
              )}
            >
              {/* Barre de fond proportionnelle */}
              {showPct && (
                <div
                  className={clsx(
                    'absolute inset-0 opacity-10 transition-all',
                    isCorrect ? 'bg-green-500' : isWrong ? 'bg-red-500' : 'bg-primary-500'
                  )}
                  style={{ width: `${pct}%` }}
                />
              )}

              {/* Icône résultat */}
              {isCorrect && <Check size={12} className="relative z-10 text-green-400" />}
              {isWrong   && <X    size={12} className="relative z-10 text-red-400" />}
              {isMyChoice && !isCorrect && !isWrong && (
                <div className="relative z-10 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center">
                  <Check size={9} className="text-white" />
                </div>
              )}

              <span className="relative z-10 leading-tight">{option}</span>

              {showPct && (
                <span className="relative z-10 text-[10px] font-black opacity-70">{pct}%</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
interface MatchPollsTabProps {
  matchId: string
  matchStatus: 'scheduled' | 'live' | 'completed' | 'cancelled'
}

export function MatchPollsTab({ matchId, matchStatus }: MatchPollsTabProps) {
  const { data: polls, isLoading } = usePollsByMatch(matchId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!polls?.length) {
    return (
      <div className="card py-10 text-center opacity-50 mx-2">
        <BarChart2 size={28} className="mx-auto mb-2 text-text-muted" />
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted">
          {matchStatus === 'scheduled'
            ? 'Aucun pronostic disponible pour ce match'
            : 'Aucun pronostic pour ce match'}
        </p>
      </div>
    )
  }

  const activePolls    = polls.filter(p => p.status === 'active')
  const closedPolls    = polls.filter(p => p.status === 'closed')
  const completedPolls = polls.filter(p => p.status === 'completed')

  return (
    <div className="space-y-4 mx-2">
      {/* Bandeau info selon le statut */}
      {matchStatus === 'live' && activePolls.length === 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <Lock size={12} className="text-yellow-400 shrink-0" />
          <p className="text-[11px] font-bold text-yellow-400 uppercase tracking-wide">
            Votes fermés — le match est en cours
          </p>
        </div>
      )}

      {/* Pronostics actifs */}
      {activePolls.length > 0 && (
        <div className="card space-y-5">
          <p className="text-[10px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Pronostics ouverts ({activePolls.length})
          </p>
          {activePolls.map(p => (
            <MatchPollItem key={p.id} pollId={p.id} />
          ))}
        </div>
      )}

      {/* En attente de résultat */}
      {closedPolls.length > 0 && (
        <div className="card space-y-5 opacity-80">
          <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">
            En attente de résultat ({closedPolls.length})
          </p>
          {closedPolls.map(p => (
            <MatchPollItem key={p.id} pollId={p.id} />
          ))}
        </div>
      )}

      {/* Résolus */}
      {completedPolls.length > 0 && (
        <div className="card space-y-5">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
            Résultats ({completedPolls.length})
          </p>
          {completedPolls.map(p => (
            <MatchPollItem key={p.id} pollId={p.id} />
          ))}
        </div>
      )}
    </div>
  )
}
