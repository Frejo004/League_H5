import { BarChart2, Check, Lock, TrendingUp, UserPlus } from 'lucide-react'
import { usePollsByMatch } from '@/hooks/usePolls'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import type { PollWithRelations } from '@/hooks/usePolls'

// Récupère uniquement les comptages de votes — pas besoin d'auth
function usePollVoteCounts(pollId: string) {
  return useQuery({
    queryKey: ['poll-counts-public', pollId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('predictions')
        .select('option_index')
        .eq('poll_id', pollId)
      if (error) throw error
      return (data ?? []) as { option_index: number }[]
    },
    staleTime: 30_000,
  })
}

function PublicPollItem({ poll }: { poll: PollWithRelations }) {
  const { data: votes } = usePollVoteCounts(poll.id)

  const totalVotes = votes?.length ?? 0
  const isResolved = poll.status === 'completed' && poll.correct_option_index != null
  const isClosed   = poll.status === 'closed' || poll.status === 'completed'

  const votesByOption = poll.options.map((_, idx) =>
    votes?.filter(v => v.option_index === idx).length ?? 0
  )

  // Trouver l'option la plus votée (pour highlight "favori")
  const maxVotes = Math.max(...votesByOption, 1)

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-[var(--t1)]">{poll.question}</p>
        <span className="text-[10px] text-[var(--tm)] shrink-0">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Options style cotes */}
      <div className={clsx(
        'grid gap-2',
        poll.options.length === 2 ? 'grid-cols-2' : poll.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
      )}>
        {poll.options.map((option: string, idx: number) => {
          const votes_count = votesByOption[idx]
          const pct         = totalVotes > 0 ? Math.round((votes_count / totalVotes) * 100) : 0
          const isFavorite  = votes_count === maxVotes && totalVotes > 0
          const isCorrect   = isResolved && poll.correct_option_index === idx

          return (
            <div
              key={idx}
              className={clsx(
                'relative flex flex-col items-center justify-center gap-1.5',
                'py-3 px-2 rounded-xl border overflow-hidden text-center',
                isCorrect
                  ? 'bg-green-500/10 border-green-500/30'
                  : isFavorite && !isClosed
                    ? 'bg-[var(--bg-pill)] border-[var(--accent)]/30'
                    : 'bg-[var(--bg-pill)] border-[var(--bd)]'
              )}
            >
              {/* Barre de fond */}
              {totalVotes > 0 && (
                <div
                  className={clsx(
                    'absolute inset-0 opacity-15',
                    isCorrect ? 'bg-green-500' : 'bg-[var(--accent)]'
                  )}
                  style={{ width: `${pct}%`, transition: 'width 0.5s ease' }}
                />
              )}

              {isCorrect && (
                <Check size={12} className="relative z-10 text-green-400" />
              )}

              <span className={clsx(
                'relative z-10 text-xs font-bold leading-tight',
                isCorrect ? 'text-green-400' : 'text-[var(--t1)]'
              )}>
                {option}
              </span>

              {/* Pourcentage = la "cote communauté" */}
              <span className={clsx(
                'relative z-10 text-base font-black tabular-nums',
                isCorrect ? 'text-green-400' : isFavorite ? 'text-[var(--accent)]' : 'text-[var(--t2)]'
              )}
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {pct}%
              </span>

              {isFavorite && !isClosed && totalVotes > 0 && (
                <span className="relative z-10 flex items-center gap-0.5 text-[9px] font-black text-[var(--accent)] uppercase tracking-wide">
                  <TrendingUp size={8} /> Favori
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Résultat si résolu */}
      {isResolved && poll.correct_option_index != null && (
        <p className="text-[10px] text-green-400 font-bold flex items-center gap-1">
          <Check size={10} />
          Résultat : {poll.options[poll.correct_option_index]}
        </p>
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
interface PublicMatchPollsProps {
  matchId: string
}

export function PublicMatchPolls({ matchId }: PublicMatchPollsProps) {
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
      <div className="rounded-2xl border border-[var(--bd)] bg-[var(--bg-surface)] p-10 text-center">
        <BarChart2 size={28} className="mx-auto mb-3 text-[var(--tm)]" />
        <p className="text-[12px] font-black text-[var(--t2)] uppercase tracking-[0.2em]">
          Aucun pronostic pour ce match
        </p>
      </div>
    )
  }

  const activePolls    = polls.filter(p => p.status === 'active')
  const closedPolls    = polls.filter(p => p.status === 'closed')
  const completedPolls = polls.filter(p => p.status === 'completed')
  const hasActive      = activePolls.length > 0

  return (
    <div className="space-y-4">

      {/* CTA inscription si des votes sont ouverts */}
      {hasActive && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5">
          <div className="flex items-center gap-2 min-w-0">
            <Lock size={13} className="text-[var(--accent)] shrink-0" />
            <p className="text-[11px] font-bold text-[var(--t1)] truncate">
              Connecte-toi pour voter et gagner des points
            </p>
          </div>
          <Link
            to="/auth/signup"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide shrink-0 transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: '#0D1117' }}
          >
            <UserPlus size={11} />
            S'inscrire
          </Link>
        </div>
      )}

      {/* Pronostics ouverts */}
      {activePolls.length > 0 && (
        <div className="rounded-2xl border border-[var(--bd)] bg-[var(--bg-surface)] p-5 space-y-5">
          <p className="text-[10px] font-black text-green-400 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Pronostics ouverts ({activePolls.length})
          </p>
          {activePolls.map(p => <PublicPollItem key={p.id} poll={p} />)}
        </div>
      )}

      {/* En attente */}
      {closedPolls.length > 0 && (
        <div className="rounded-2xl border border-[var(--bd)] bg-[var(--bg-surface)] p-5 space-y-5 opacity-80">
          <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">
            Votes fermés — résultat en attente ({closedPolls.length})
          </p>
          {closedPolls.map(p => <PublicPollItem key={p.id} poll={p} />)}
        </div>
      )}

      {/* Résultats */}
      {completedPolls.length > 0 && (
        <div className="rounded-2xl border border-[var(--bd)] bg-[var(--bg-surface)] p-5 space-y-5">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
            Résultats ({completedPolls.length})
          </p>
          {completedPolls.map(p => <PublicPollItem key={p.id} poll={p} />)}
        </div>
      )}

      {/* Footer CTA */}
      <div className="rounded-xl border border-[var(--bd)] p-4 text-center space-y-2">
        <p className="text-[11px] font-bold text-[var(--t2)]">
          Créez un compte pour voter, accumuler des points et grimper au classement des pronostiqueurs.
        </p>
        <Link
          to="/auth/signup"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-colors"
          style={{ backgroundColor: 'var(--accent)', color: '#0D1117' }}
        >
          <UserPlus size={13} />
          Rejoindre la ligue
        </Link>
      </div>
    </div>
  )
}
