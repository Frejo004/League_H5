import { BarChart2, Trophy } from 'lucide-react'
import { usePolls } from '@/hooks/usePolls'
import { PollCard } from '@/components/PollCard'
import { PageHero } from '@/components/ui/PageHero'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function PollsPage() {
  const { data: polls, isLoading } = usePolls()

  const activePolls = polls?.filter(p => p.status === 'active') || []
  const otherPolls = polls?.filter(p => p.status !== 'active') || []

  return (
    <div className="space-y-6">
      <PageHero
        imageUrl="https://images.unsplash.com/photo-1461896836934-ffe607ba821?w=1200&q=80&auto=format&fit=crop"
        pattern="lines"
        accentColor="#8b5cf6"
        title="Sondages & Pronostics"
        subtitle="Participez aux sondages et donnez votre avis !"
        icon={<BarChart2 size={20} className="text-purple-400" />}
        compact
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : activePolls.length > 0 || otherPolls.length > 0 ? (
        <div className="space-y-8">
          {activePolls.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                <Trophy size={16} className="text-green-400" />
                Sondages actifs
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activePolls.map(poll => (
                  <PollCard key={poll.id} pollId={poll.id} />
                ))}
              </div>
            </div>
          )}

          {otherPolls.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-4">
                Autres sondages
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {otherPolls.map(poll => (
                  <PollCard key={poll.id} pollId={poll.id} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card py-12 text-center opacity-50">
          <BarChart2 size={32} className="mx-auto mb-3 text-text-muted" />
          <p className="text-xs font-bold uppercase tracking-widest">Aucun sondage pour le moment</p>
        </div>
      )}
    </div>
  )
}
