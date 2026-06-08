import { useState } from 'react'
import { BarChart2, Trophy, Medal } from 'lucide-react'
import { usePolls, useLeaderboard } from '@/hooks/usePolls'
import { useActiveSeason } from '@/hooks/useSeasons'
import { PollCard } from '@/components/PollCard'
import { PageHero } from '@/components/ui/PageHero'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PlayerAvatar } from '@/components/ui/PlayerAvatar'
import clsx from 'clsx'

type Tab = 'polls' | 'leaderboard'

const MEDAL_COLORS = ['text-yellow-400', 'text-slate-300', 'text-amber-600']

export function PollsPage() {
  const [tab, setTab] = useState<Tab>('polls')
  const { data: season } = useActiveSeason()
  const { data: polls, isLoading } = usePolls()
  const { data: leaderboard, isLoading: loadingLb } = useLeaderboard(season?.id)

  const activePolls  = polls?.filter(p => p.status === 'active') ?? []
  const closedPolls  = polls?.filter(p => p.status === 'closed') ?? []
  const donePolls    = polls?.filter(p => p.status === 'completed') ?? []

  return (
    <div className="space-y-6">
      <PageHero
        imageUrl="https://images.unsplash.com/photo-1461896836934-ffe607ba821?w=1200&q=80&auto=format&fit=crop"
        pattern="lines"
        accentColor="#8b5cf6"
        title="Sondages & Pronostics"
        subtitle="Faites vos pronostics et grimpez au classement !"
        icon={<BarChart2 size={20} className="text-purple-400" />}
        compact
      />

      {/* Onglets */}
      <div className="flex gap-1 border-b border-surface-border">
        {([['polls', 'Pronostics'], ['leaderboard', 'Classement']] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={clsx(
              'px-4 py-2.5 text-sm font-bold uppercase tracking-widest transition-colors',
              tab === id
                ? 'text-primary-400 border-b-2 border-primary-500 -mb-px'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Onglet Pronostics ── */}
      {tab === 'polls' && (
        isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (activePolls.length + closedPolls.length + donePolls.length) === 0 ? (
          <div className="card py-12 text-center opacity-50">
            <BarChart2 size={32} className="mx-auto mb-3 text-text-muted" />
            <p className="text-xs font-bold uppercase tracking-widest">Aucun sondage pour le moment</p>
          </div>
        ) : (
          <div className="space-y-8">
            {activePolls.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Trophy size={16} className="text-green-400" />
                  Ouverts ({activePolls.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activePolls.map(poll => <PollCard key={poll.id} pollId={poll.id} />)}
                </div>
              </section>
            )}
            {closedPolls.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-yellow-500 uppercase tracking-widest mb-4">
                  En attente de résultat ({closedPolls.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {closedPolls.map(poll => <PollCard key={poll.id} pollId={poll.id} />)}
                </div>
              </section>
            )}
            {donePolls.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-4">
                  Terminés ({donePolls.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {donePolls.map(poll => <PollCard key={poll.id} pollId={poll.id} />)}
                </div>
              </section>
            )}
          </div>
        )
      )}

      {/* ── Onglet Classement ── */}
      {tab === 'leaderboard' && (
        loadingLb ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : !leaderboard?.length ? (
          <div className="card py-12 text-center opacity-50">
            <Medal size={32} className="mx-auto mb-3 text-text-muted" />
            <p className="text-xs font-bold uppercase tracking-widest">Aucun pronostic résolu pour le moment</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-raised/50">
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted w-10">#</th>
                  <th className="text-left px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Joueur</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted">Points</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted hidden sm:table-cell">Corrects</th>
                  <th className="text-right px-4 py-3 text-[10px] font-black uppercase tracking-widest text-text-muted hidden sm:table-cell">Taux</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => (
                  <tr
                    key={entry.user_id}
                    className={clsx(
                      'border-b border-surface-border/40 last:border-0 transition-colors hover:bg-surface-raised/30',
                      idx === 0 && 'bg-yellow-500/5'
                    )}
                  >
                    <td className="px-4 py-3">
                      {idx < 3
                        ? <Medal size={16} className={MEDAL_COLORS[idx]} />
                        : <span className="text-text-muted font-bold">{idx + 1}</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <PlayerAvatar
                          avatarUrl={entry.avatar_url}
                          firstName={entry.full_name?.split(' ')[0] ?? '?'}
                          lastName={entry.full_name?.split(' ').slice(1).join(' ') ?? ''}
                          size={28}
                        />
                        <span className="font-bold text-text-primary truncate">
                          {entry.full_name ?? 'Anonyme'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-primary-400">
                      {entry.total_points} pts
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary hidden sm:table-cell">
                      {entry.correct_predictions}/{entry.total_predictions}
                    </td>
                    <td className="px-4 py-3 text-right hidden sm:table-cell">
                      <span className={clsx(
                        'font-bold text-xs',
                        entry.success_rate >= 60 ? 'text-green-400' : entry.success_rate >= 40 ? 'text-yellow-400' : 'text-text-muted'
                      )}>
                        {entry.success_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
