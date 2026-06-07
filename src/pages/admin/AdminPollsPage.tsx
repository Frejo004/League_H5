import { useState } from 'react'
import {
  BarChart2, Plus, Check, Trash2, Play, Pause, Calendar, Trophy
} from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { usePolls } from '@/hooks/usePolls'
import { useMatches } from '@/hooks/useMatches'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'
import type { Poll, PollStatus } from '@/types/database'

function StatusBadge({ status }: { status: PollStatus }) {
  const styles = {
    draft: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    active: 'bg-green-500/10 text-green-500 border-green-500/20',
    closed: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  }
  const labels = {
    draft: 'Brouillon',
    active: 'Actif',
    closed: 'Fermé',
    completed: 'Terminé',
  }
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border', styles[status])}>
      {labels[status]}
    </span>
  )
}

export function AdminPollsPage() {
  const { data: season } = useActiveSeason()
  const { data: polls, isLoading, createPoll, updatePoll, deletePoll } = usePolls()
  const { data: matches } = useMatches(season?.id)

  const [showForm, setShowForm] = useState(false)
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null)

  const [question, setQuestion] = useState('')
  const [optionsStr, setOptionsStr] = useState('')
  const [matchId, setMatchId] = useState<string>('')
  const [status, setStatus] = useState<PollStatus>('draft')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const options = optionsStr.split('\n').filter(s => s.trim()).map(s => s.trim())
    if (!question || options.length < 2) return

    if (editingPoll) {
      await updatePoll.mutateAsync({
        id: editingPoll.id,
        question,
        options,
        match_id: matchId || null,
        status,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
      })
    } else {
      await createPoll.mutateAsync({
        question,
        options,
        match_id: matchId || null,
        status,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
      })
    }

    resetForm()
  }

  const resetForm = () => {
    setEditingPoll(null)
    setQuestion('')
    setOptionsStr('')
    setMatchId('')
    setStatus('draft')
    setStartsAt('')
    setEndsAt('')
    setShowForm(false)
  }

  const handleEdit = (poll: Poll) => {
    setEditingPoll(poll)
    setQuestion(poll.question)
    setOptionsStr(poll.options.join('\n'))
    setMatchId(poll.match_id || '')
    setStatus(poll.status)
    setStartsAt(poll.starts_at || '')
    setEndsAt(poll.ends_at || '')
    setShowForm(true)
  }

  const upcomingMatches = matches?.filter(m => m.status === 'scheduled')

  if (!season) {
    return (
      <div className="card py-12 text-center opacity-50">
        <BarChart2 size={32} className="mx-auto mb-3 text-text-muted" />
        <p className="text-xs font-bold uppercase tracking-widest">Aucune saison active</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="text-primary-500" size={20} />
            Sondages & Pronostics
          </h2>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-widest mt-1">
            Créez des sondages pour les matchs et engagez la communauté
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest"
        >
          <Plus size={16} />
          Nouveau sondage
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card border-primary-500/30 bg-primary-500/5 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                  Question
                </label>
                <input
                  type="text"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  className="input"
                  placeholder="Qui va gagner ce match ?"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                  Match (optionnel)
                </label>
                <select value={matchId} onChange={e => setMatchId(e.target.value)} className="input">
                  <option value="">Aucun</option>
                  {upcomingMatches?.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.home_team?.name} vs {m.away_team?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                  Statut
                </label>
                <select value={status} onChange={e => setStatus(e.target.value as PollStatus)} className="input">
                  <option value="draft">Brouillon</option>
                  <option value="active">Actif</option>
                  <option value="closed">Fermé</option>
                  <option value="completed">Terminé</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                  Début (optionnel)
                </label>
                <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="input" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                  Fin (optionnel)
                </label>
                <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="input" />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                  Options (une par ligne)
                </label>
                <textarea
                  value={optionsStr}
                  onChange={e => setOptionsStr(e.target.value)}
                  className="input min-h-[120px]"
                  placeholder={`Option 1\nOption 2\nOption 3`}
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary px-4 py-2 text-xs font-bold uppercase"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={createPoll.isPending || updatePoll.isPending}
                className="btn-primary px-4 py-2 text-xs font-bold uppercase flex items-center gap-2"
              >
                {createPoll.isPending || updatePoll.isPending ? <LoadingSpinner size="sm" /> : <Check size={14} />}
                {editingPoll ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : polls?.length === 0 ? (
        <div className="card py-12 text-center opacity-50">
          <BarChart2 size={32} className="mx-auto mb-3 text-text-muted" />
          <p className="text-xs font-bold uppercase tracking-widest">Aucun sondage</p>
        </div>
      ) : (
        <div className="space-y-3">
          {polls?.map(poll => (
            <div key={poll.id} className="card group">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={poll.status} />
                    {poll.match && (
                      <span className="text-[10px] text-text-muted flex items-center gap-1">
                        <Trophy size={10} />
                        {poll.match.home_team?.name} vs {poll.match.away_team?.name}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-text-primary">{poll.question}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {poll.options.map((opt: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-surface-raised rounded-lg text-xs text-text-secondary">
                        {opt}
                      </span>
                    ))}
                  </div>
                  {(poll.starts_at || poll.ends_at) && (
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-text-muted">
                      {poll.starts_at && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          Début: {new Date(poll.starts_at).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {poll.ends_at && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          Fin: {new Date(poll.ends_at).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {poll.status === 'draft' && (
                    <button
                      onClick={() => updatePoll.mutate({ id: poll.id, status: 'active' })}
                      className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-colors"
                      title="Activer"
                    >
                      <Play size={14} />
                    </button>
                  )}
                  {poll.status === 'active' && (
                    <button
                      onClick={() => updatePoll.mutate({ id: poll.id, status: 'closed' })}
                      className="p-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 transition-colors"
                      title="Fermer"
                    >
                      <Pause size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(poll)}
                    className="p-2 rounded-lg bg-surface-raised hover:bg-primary-500/10 text-text-muted hover:text-primary-500 transition-colors"
                    title="Modifier"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Supprimer ce sondage ?')) {
                        deletePoll.mutate(poll.id)
                      }
                    }}
                    className="p-2 rounded-lg bg-surface-raised hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
