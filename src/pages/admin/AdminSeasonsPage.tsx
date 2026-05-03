import { useState } from 'react'
import { Plus, Check, Lock, Unlock } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useSeasons, useCreateSeason, useUpdateSeason } from '@/hooks/useSeasons'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Season } from '@/types/database'

export function AdminSeasonsPage() {
  const { data: seasons, isLoading } = useSeasons()
  const createSeason = useCreateSeason()
  const updateSeason = useUpdateSeason()
  const qc = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createSeason.mutateAsync({
        name,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      })
      setName(''); setStartDate(''); setEndDate('')
      setShowForm(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    }
  }

  async function toggleActive(season: Season) {
    if (!season.is_active) {
      const { error } = await supabase.rpc('set_active_season', { p_season_id: season.id })
      if (error) throw error
      // Invalidate seasons cache after atomic swap
      qc.invalidateQueries({ queryKey: ['seasons'] })
    }
  }

  async function toggleLock(season: Season) {
    await updateSeason.mutateAsync({ id: season.id, is_locked: !season.is_locked })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Saisons</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nouvelle saison
        </button>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="font-medium text-white mb-4">Créer une saison</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            <div>
              <label className="label">Nom de la saison</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="input"
                placeholder="Saison 2025-2026"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Date de début</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Date de fin</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={createSeason.isPending} className="btn-primary flex items-center gap-2">
                {createSeason.isPending ? <LoadingSpinner size="sm" /> : null}
                Créer
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
      ) : !seasons?.length ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">Aucune saison créée.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {seasons.map(season => (
            <div key={season.id} className="card flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{season.name}</h3>
                  {season.is_active && (
                    <span className="badge bg-primary-600/20 text-primary-400 border border-primary-600/30">Active</span>
                  )}
                  {season.is_locked && (
                    <span className="badge bg-red-500/20 text-red-400">Verrouillée</span>
                  )}
                </div>
                {(season.start_date || season.end_date) && (
                  <p className="text-sm text-slate-400 mt-0.5">
                    {season.start_date && new Date(season.start_date).toLocaleDateString('fr-FR')}
                    {season.start_date && season.end_date && ' → '}
                    {season.end_date && new Date(season.end_date).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!season.is_active && (
                  <button
                    onClick={() => toggleActive(season)}
                    disabled={updateSeason.isPending}
                    className="btn-secondary flex items-center gap-1.5 text-sm py-1.5"
                    title="Activer cette saison"
                  >
                    <Check size={14} />
                    Activer
                  </button>
                )}
                <button
                  onClick={() => toggleLock(season)}
                  disabled={updateSeason.isPending}
                  className="btn-secondary flex items-center gap-1.5 text-sm py-1.5"
                  title={season.is_locked ? 'Déverrouiller' : 'Verrouiller'}
                >
                  {season.is_locked ? <Unlock size={14} /> : <Lock size={14} />}
                  {season.is_locked ? 'Déverrouiller' : 'Verrouiller'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
