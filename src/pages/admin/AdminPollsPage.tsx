import { useState } from 'react'
import { BarChart2, Plus, Check, Trash2, Play, Pause, Calendar, Trophy, Zap } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { usePolls, POLL_TYPE_CONFIG, getWinnerOptions } from '@/hooks/usePolls'
import { useMatches } from '@/hooks/useMatches'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { clsx } from 'clsx'
import type { Poll, PollStatus, PollType, MatchWithTeams } from '@/types/database'

const AUTO_TYPES: Exclude<PollType, 'custom'>[] = [
  'winner', 'btts', 'total_goals',
  'goals_home', 'goals_away',
  'goals_ht', 'goals_ht_home', 'goals_ht_away',
  'cards_total', 'cards_home', 'cards_away',
  'shots_total', 'shots_home', 'shots_away',
  'corners', 'fouls',
]

const POLL_TYPE_LABELS: Record<PollType, string> = {
  custom:        'Sondage libre',
  winner:        'Vainqueur',
  btts:          'Les 2 équipes marquent',
  total_goals:   'Total buts',
  goals_home:    'Buts domicile',
  goals_away:    'Buts extérieur',
  goals_ht:      'Buts MT total',
  goals_ht_home: 'Buts domicile MT',
  goals_ht_away: 'Buts extérieur MT',
  cards_total:   'Cartons total',
  cards_home:    'Cartons domicile',
  cards_away:    'Cartons extérieur',
  shots_total:   'Tirs total',
  shots_home:    'Tirs domicile',
  shots_away:    'Tirs extérieur',
  corners:       'Corners',
  fouls:         'Fautes',
}

function StatusBadge({ status }: { status: PollStatus }) {
  const styles: Record<PollStatus, string> = {
    draft:     'bg-slate-500/10 text-slate-500 border-slate-500/20',
    active:    'bg-green-500/10 text-green-500 border-green-500/20',
    closed:    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  }
  const labels: Record<PollStatus, string> = {
    draft: 'Brouillon', active: 'Actif', closed: 'Fermé', completed: 'Terminé',
  }
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border', styles[status])}>
      {labels[status]}
    </span>
  )
}

// ── Panel auto-création batch pour un match ───────────────────────────────────
function AutoCreatePanel({ matches }: { matches: MatchWithTeams[] }) {
  const { createMatchPolls } = usePolls()
  const [selectedMatch, setSelectedMatch] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<Set<Exclude<PollType, 'custom'>>>(
    new Set(['winner', 'btts', 'total_goals'])
  )
  const [success, setSuccess] = useState(false)

  const toggleType = (t: Exclude<PollType, 'custom'>) =>
    setSelectedTypes(prev => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })

  const match = matches.find(m => m.id === selectedMatch)

  async function handleCreate() {
    if (!match || selectedTypes.size === 0) return
    const homeName = match.home_team?.name ?? 'Domicile'
    const awayName = match.away_team?.name ?? 'Extérieur'
    await createMatchPolls.mutateAsync({
      matchId: match.id,
      homeName,
      awayName,
      scheduledAt: match.scheduled_at,
      types: [...selectedTypes],
    })
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="card border-yellow-500/20 bg-yellow-500/5 space-y-4">
      <div className="flex items-center gap-2">
        <Zap size={16} className="text-yellow-400" />
        <h3 className="text-sm font-black uppercase tracking-wider text-text-primary">
          Génération automatique par match
        </h3>
      </div>

      {/* Sélection du match */}
      <div>
        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
          Match
        </label>
        <select value={selectedMatch} onChange={e => setSelectedMatch(e.target.value)} className="input">
          <option value="">Sélectionner un match...</option>
          {matches.map(m => (
            <option key={m.id} value={m.id}>
              {m.home_team?.name} vs {m.away_team?.name}
              {m.scheduled_at ? ` — ${new Date(m.scheduled_at).toLocaleDateString('fr-FR')}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Aperçu des options générées pour le type winner */}
      {match && selectedTypes.has('winner') && (
        <div className="flex items-center gap-2 text-[10px] text-text-muted">
          <span className="font-bold text-yellow-400">Options Vainqueur :</span>
          {getWinnerOptions(match.home_team?.name ?? '', match.away_team?.name ?? '').map((o, i) => (
            <span key={i} className="px-2 py-0.5 rounded bg-surface-raised border border-surface-border">{o}</span>
          ))}
        </div>
      )}

      {/* Types à générer */}
      <div>
        <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-2 block">
          Types de pronostics ({selectedTypes.size} sélectionnés)
        </label>
        <div className="flex flex-wrap gap-2">
          {AUTO_TYPES.map(type => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide border transition-all',
                selectedTypes.has(type)
                  ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
                  : 'bg-surface-raised border-surface-border text-text-muted hover:border-slate-500'
              )}
            >
              {POLL_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleCreate}
          disabled={!selectedMatch || selectedTypes.size === 0 || createMatchPolls.isPending}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest"
        >
          {createMatchPolls.isPending ? <LoadingSpinner size="sm" /> : <Zap size={14} />}
          Générer {selectedTypes.size} pronostic{selectedTypes.size > 1 ? 's' : ''}
        </button>
        {success && <span className="text-green-400 text-xs font-bold">✓ Pronostics créés !</span>}
        {createMatchPolls.isError && (
          <span className="text-red-400 text-xs font-bold">Erreur lors de la création</span>
        )}
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export function AdminPollsPage() {
  const { data: season } = useActiveSeason()
  const { data: polls, isLoading, createPoll, updatePoll, deletePoll, deleteAllPolls } = usePolls()
  const { data: matches } = useMatches(season?.id)

  const [showForm, setShowForm] = useState(false)
  const [showAutoCreate, setShowAutoCreate] = useState(false)
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null)

  // Modales de confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)

  const [question, setQuestion]   = useState('')
  const [optionsStr, setOptionsStr] = useState('')
  const [matchId, setMatchId]     = useState<string>('')
  const [pollType, setPollType]   = useState<PollType>('custom')
  const [status, setStatus]       = useState<PollStatus>('draft')
  const [startsAt, setStartsAt]   = useState('')
  const [endsAt, setEndsAt]       = useState('')

  const scheduledMatches = matches?.filter(m => m.status === 'scheduled') ?? []

  // Quand on choisit un type auto + un match → pré-remplir question & options
  function handleTypeChange(type: PollType) {
    setPollType(type)
    if (type === 'custom' || !matchId) return
    const match = matches?.find(m => m.id === matchId)
    if (!match) return
    const homeName = match.home_team?.name ?? 'Domicile'
    const awayName = match.away_team?.name ?? 'Extérieur'
    if (type === 'winner') {
      setQuestion(POLL_TYPE_CONFIG.winner.question(homeName, awayName))
      setOptionsStr(getWinnerOptions(homeName, awayName).join('\n'))
    } else {
      const config = POLL_TYPE_CONFIG[type as Exclude<PollType, 'custom'>]
      setQuestion(config.question(homeName, awayName))
      setOptionsStr(config.options.join('\n'))
    }
  }

  function handleMatchChange(id: string) {
    setMatchId(id)
    if (pollType === 'custom' || !id) return
    const match = matches?.find(m => m.id === id)
    if (!match) return
    const homeName = match.home_team?.name ?? 'Domicile'
    const awayName = match.away_team?.name ?? 'Extérieur'
    if (pollType === 'winner') {
      setQuestion(POLL_TYPE_CONFIG.winner.question(homeName, awayName))
      setOptionsStr(getWinnerOptions(homeName, awayName).join('\n'))
    } else {
      const config = POLL_TYPE_CONFIG[pollType as Exclude<PollType, 'custom'>]
      if (config) {
        setQuestion(config.question(homeName, awayName))
        setOptionsStr(config.options.join('\n'))
      }
    }
    // Pré-remplir ends_at avec scheduled_at du match
    const scheduledAt = match.scheduled_at
    if (scheduledAt) setEndsAt(new Date(scheduledAt).toISOString().slice(0, 16))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const options = optionsStr.split('\n').filter(s => s.trim()).map(s => s.trim())
    if (!question || options.length < 2) return

    const payload = {
      question,
      options,
      match_id: matchId || null,
      poll_type: pollType,
      status,
      starts_at: startsAt || null,
      ends_at: endsAt || null,
    }

    if (editingPoll) {
      await updatePoll.mutateAsync({ id: editingPoll.id, ...payload })
    } else {
      await createPoll.mutateAsync(payload)
    }
    resetForm()
  }

  const resetForm = () => {
    setEditingPoll(null)
    setQuestion(''); setOptionsStr(''); setMatchId('')
    setPollType('custom'); setStatus('draft')
    setStartsAt(''); setEndsAt('')
    setShowForm(false)
  }

  const handleEdit = (poll: Poll) => {
    setEditingPoll(poll)
    setQuestion(poll.question)
    setOptionsStr(poll.options.join('\n'))
    setMatchId(poll.match_id || '')
    setPollType(poll.poll_type)
    setStatus(poll.status)
    setStartsAt(poll.starts_at || '')
    setEndsAt(poll.ends_at || '')
    setShowForm(true)
    setShowAutoCreate(false)
  }

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
            {polls?.length ?? 0} sondage{(polls?.length ?? 0) > 1 ? 's' : ''} — résolution automatique à la fin des matchs
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(polls?.length ?? 0) > 0 && (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              disabled={deleteAllPolls.isPending}
              className="btn-secondary flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10"
            >
              {deleteAllPolls.isPending ? <LoadingSpinner size="sm" /> : <Trash2 size={14} />}
              Tout supprimer
            </button>
          )}
          <button
            onClick={() => { setShowAutoCreate(!showAutoCreate); setShowForm(false) }}
            className="btn-secondary flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest"
          >
            <Zap size={14} />
            Auto
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setShowAutoCreate(false); resetForm() }}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest"
          >
            <Plus size={14} />
            Manuel
          </button>
        </div>
      </div>

      {/* Panel auto-création */}
      {showAutoCreate && scheduledMatches.length > 0 && (
        <AutoCreatePanel matches={scheduledMatches as MatchWithTeams[]} />
      )}
      {showAutoCreate && scheduledMatches.length === 0 && (
        <div className="card py-8 text-center opacity-50">
          <p className="text-xs font-bold uppercase tracking-widest">Aucun match programmé</p>
        </div>
      )}

      {/* Formulaire manuel */}
      {showForm && (
        <div className="card border-primary-500/30 bg-primary-500/5 animate-in slide-in-from-top-4 duration-300">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Type */}
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                  Type de pronostic
                </label>
                <select value={pollType} onChange={e => handleTypeChange(e.target.value as PollType)} className="input">
                  <option value="custom">Sondage libre</option>
                  <optgroup label="── Résultats ──">
                    <option value="winner">Vainqueur</option>
                    <option value="btts">Les 2 équipes marquent</option>
                  </optgroup>
                  <optgroup label="── Buts ──">
                    <option value="total_goals">Total buts</option>
                    <option value="goals_home">Buts domicile</option>
                    <option value="goals_away">Buts extérieur</option>
                    <option value="goals_ht">Buts MT total</option>
                    <option value="goals_ht_home">Buts domicile MT</option>
                    <option value="goals_ht_away">Buts extérieur MT</option>
                  </optgroup>
                  <optgroup label="── Discipline ──">
                    <option value="cards_total">Cartons total</option>
                    <option value="cards_home">Cartons domicile</option>
                    <option value="cards_away">Cartons extérieur</option>
                  </optgroup>
                  <optgroup label="── Jeu ──">
                    <option value="shots_total">Tirs total</option>
                    <option value="shots_home">Tirs domicile</option>
                    <option value="shots_away">Tirs extérieur</option>
                    <option value="corners">Corners</option>
                    <option value="fouls">Fautes</option>
                  </optgroup>
                </select>
              </div>

              {/* Match */}
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                  Match (optionnel)
                </label>
                <select value={matchId} onChange={e => handleMatchChange(e.target.value)} className="input">
                  <option value="">Aucun</option>
                  {scheduledMatches.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.home_team?.name} vs {m.away_team?.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Question */}
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

              {/* Options */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                  Options (une par ligne)
                </label>
                <textarea
                  value={optionsStr}
                  onChange={e => setOptionsStr(e.target.value)}
                  className="input min-h-[100px]"
                  placeholder={'Option 1\nOption 2\nOption 3'}
                  required
                />
              </div>

              {/* Statut */}
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

              {/* Dates */}
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1.5 block">
                  Fermeture (optionnel)
                </label>
                <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="input" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={resetForm} className="btn-secondary px-4 py-2 text-xs font-bold uppercase">
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

      {/* Liste */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : !polls?.length ? (
        <div className="card py-12 text-center opacity-50">
          <BarChart2 size={32} className="mx-auto mb-3 text-text-muted" />
          <p className="text-xs font-bold uppercase tracking-widest">Aucun sondage</p>
        </div>
      ) : (
        <div className="space-y-3">
          {polls.map(poll => (
            <div key={poll.id} className="card group">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <StatusBadge status={poll.status} />
                    {poll.poll_type !== 'custom' && (
                      <span className="px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400 text-[10px] font-bold uppercase tracking-wide border border-primary-500/20">
                        {POLL_TYPE_LABELS[poll.poll_type]}
                      </span>
                    )}
                    {poll.match && (
                      <span className="text-[10px] text-text-muted flex items-center gap-1">
                        <Trophy size={10} />
                        {poll.match.home_team?.name} vs {poll.match.away_team?.name}
                      </span>
                    )}
                    {poll.correct_option_index != null && (
                      <span className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                        <Check size={10} /> Bonne réponse : {poll.options[poll.correct_option_index]}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-text-primary text-sm">{poll.question}</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {poll.options.map((opt: string, idx: number) => (
                      <span
                        key={idx}
                        className={clsx(
                          'px-2 py-0.5 rounded-lg text-xs',
                          poll.correct_option_index === idx
                            ? 'bg-green-500/15 text-green-400 border border-green-500/30 font-bold'
                            : 'bg-surface-raised text-text-secondary'
                        )}
                      >
                        {opt}
                      </span>
                    ))}
                  </div>
                  {poll.ends_at && (
                    <p className="mt-1.5 flex items-center gap-1 text-[10px] text-text-muted">
                      <Calendar size={10} />
                      Fermeture : {new Date(poll.ends_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
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
                    onClick={() => setConfirmDeleteId(poll.id)}
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

      {/* Modale suppression individuelle */}
      {confirmDeleteId && (
        <ConfirmModal
          message="Supprimer ce sondage ? Cette action est irréversible et effacera également tous les paris associés."
          confirmLabel="Supprimer"
          danger
          onConfirm={() => {
            deletePoll.mutate(confirmDeleteId)
            setConfirmDeleteId(null)
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {/* Modale suppression totale */}
      {confirmDeleteAll && (
        <ConfirmModal
          message={`Supprimer tous les ${polls?.length ?? 0} sondages de la saison en cours ? Tous les paris des joueurs seront également supprimés. Cette action est irréversible.`}
          confirmLabel="Tout supprimer"
          danger
          onConfirm={() => {
            if (season) deleteAllPolls.mutate(season.id)
            setConfirmDeleteAll(false)
          }}
          onCancel={() => setConfirmDeleteAll(false)}
        />
      )}
    </div>
  )
}
