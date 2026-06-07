import { useState } from 'react'
import { BarChart2, Check, Trophy } from 'lucide-react'
import { usePoll } from '@/hooks/usePolls'
import { LoadingSpinner } from './ui/LoadingSpinner'

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

  const isActive = poll.data.status === 'active'
  const isClosed = poll.data.status === 'closed' || poll.data.status === 'completed'

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
    <div className="card">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary-500/10 text-primary-500">
            <BarChart2 size={16} />
          </div>
          <div>
            <h3 className="font-bold text-text-primary">{poll.data.question}</h3>
            {poll.data.match && (
              <div className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                <Trophy size={10} />
                {poll.data.match.home_team?.name} vs {poll.data.match.away_team?.name}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted">{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</p>
          {!isActive && (
            <p className="text-[10px] text-yellow-500 font-bold uppercase mt-0.5">
              {poll.data.status === 'closed' ? 'Fermé' : 'Terminé'}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {poll.data.options.map((option: string, idx: number) => {
          const votes = votesByOption[idx] || 0
          const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
          const isUserChoice = userPrediction.data?.option_index === idx

          return (
            <button
              key={idx}
              onClick={() => handleVote(idx)}
              disabled={!isActive}
              className="w-full text-left p-3 rounded-lg transition-all relative overflow-hidden bg-surface-raised border border-surface-border hover:border-primary-500/20"
            >
              {(isClosed || userPrediction.data) && (
                <div
                  className="absolute inset-0 bg-primary-500/5 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {isUserChoice && (
                    <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center text-white">
                      <Check size={12} />
                    </div>
                  )}
                  <span className={`font-medium ${isUserChoice ? 'text-primary-400' : 'text-text-primary'}`}>
                    {option}
                  </span>
                </div>
                {(isClosed || userPrediction.data) && (
                  <span className="text-xs font-bold text-text-primary">
                    {percentage}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
