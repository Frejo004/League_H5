import { useState } from 'react'
import { BarChart2, Check, Trophy, X, Star } from 'lucide-react'
import { usePoll } from '@/hooks/usePolls'
import { LoadingSpinner } from './ui/LoadingSpinner'
import clsx from 'clsx'

export function PollCard({ pollId }: { pollId: string }) {
  const { poll, predictions, userPrediction, vote } = usePoll(pollId)
  const [isVoting, setIsVoting] = useState(false)

  if (poll.isLoading || !poll.data) {
    return (
      <div className="card flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const totalVotes = predictions.data?.length || 0
  const votesByOption = poll.data.options.map((_, idx) =>
    predictions.data?.filter((p) => p.option_index === idx).length || 0
  )

  const isActive  = poll.data.status === 'active'
  const isResolved = poll.data.status === 'completed' && poll.data.correct_option_index != null
  const showResults = poll.data.status !== 'active' || !!userPrediction.data

  const userPredictionData = userPrediction.data
  const userWon = isResolved && userPredictionData?.is_correct === true

  const handleVote = async (optionIndex: number) => {
    if (!isActive || isVoting) return
    setIsVoting(true)
    try {
      await vote.mutateAsync({ optionIndex })
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className={clsx(
            'p-2 rounded-lg',
            isResolved
              ? userWon ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-400'
              : 'bg-primary-500/10 text-primary-500'
          )}>
            <BarChart2 size={16} />
          </div>
          <div>
            <h3 className="font-bold text-text-primary text-sm">{poll.data.question}</h3>
            {poll.data.match && (
              <div className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                <Trophy size={10} />
                Match {poll.data.match.matchday}
              </div>
            )}
          </div>
        </div>

        {/* Badge statut + points */}
        <div className="text-right shrink-0">
          <p className="text-xs text-text-muted">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
          {isResolved && userPredictionData && (
            <div className={clsx(
              'flex items-center justify-end gap-1 mt-1 text-[10px] font-bold uppercase',
              userWon ? 'text-green-400' : 'text-slate-500'
            )}>
              {userWon
                ? <><Star size={10} fill="currentColor" /> +{userPredictionData.points_earned} pts</>
                : <><X size={10} /> Raté</>
              }
            </div>
          )}
          {!isResolved && poll.data.status !== 'active' && (
            <p className="text-[10px] text-yellow-500 font-bold uppercase mt-0.5">
              {poll.data.status === 'closed' ? 'Fermé' : 'Terminé'}
            </p>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {poll.data.options.map((option: string, idx: number) => {
          const votes       = votesByOption[idx] || 0
          const percentage  = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
          const isUserChoice = userPredictionData?.option_index === idx
          const isCorrect   = isResolved && poll.data.correct_option_index === idx
          const isWrong     = isResolved && isUserChoice && !isCorrect

          return (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              disabled={!isActive || isVoting}
              className={clsx(
                'w-full text-left p-3 rounded-lg transition-all relative overflow-hidden border',
                isCorrect
                  ? 'bg-green-500/10 border-green-500/30'
                  : isWrong
                    ? 'bg-red-500/5 border-red-500/20'
                    : isUserChoice
                      ? 'bg-primary-500/10 border-primary-500/30'
                      : 'bg-surface-raised border-surface-border hover:border-primary-500/20'
              )}
            >
              {/* Barre de progression */}
              {showResults && (
                <div
                  className={clsx(
                    'absolute inset-0 transition-all opacity-20',
                    isCorrect ? 'bg-green-500' : isWrong ? 'bg-red-500' : 'bg-primary-500'
                  )}
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {/* Icône résultat */}
                  {isCorrect && (
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
                      <Check size={11} />
                    </div>
                  )}
                  {isWrong && (
                    <div className="w-5 h-5 rounded-full bg-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                      <X size={11} />
                    </div>
                  )}
                  {!isCorrect && !isWrong && isUserChoice && (
                    <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center text-white shrink-0">
                      <Check size={11} />
                    </div>
                  )}

                  <span className={clsx(
                    'text-sm font-medium',
                    isCorrect ? 'text-green-400 font-bold' : isWrong ? 'text-red-400' : 'text-text-primary'
                  )}>
                    {option}
                  </span>
                </div>

                {showResults && (
                  <span className="text-xs font-bold text-text-secondary shrink-0">
                    {percentage}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Message si vote verrouillé */}
      {!isActive && !isResolved && poll.data.status === 'closed' && (
        <p className="text-[10px] text-text-muted text-center font-bold uppercase tracking-widest">
          Les votes sont fermés — résultat en attente
        </p>
      )}
    </div>
  )
}
