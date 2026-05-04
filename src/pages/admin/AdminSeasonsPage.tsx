import { useState } from 'react'
import { Plus, Check, Lock, Unlock, Pencil, Trash2, X, Save } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useSeasons, useCreateSeason, useUpdateSeason, useDeleteSeason } from '@/hooks/useSeasons'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Season } from '@/types/database'

export function AdminSeasonsPage() {
  const { data: seasons, isLoading } = useSeasons()
  const createSeason = useCreateSeason()
  const updateSeason = useUpdateSeason()
  const deleteSeason = useDeleteSeason()
  const qc = useQueryClient()

  // ── Création ──────────────────────────────────────────────
  const [showForm, setShowForm]   = useState(false)
  const [name, setName]           = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate]     = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  // ── Édition inline ────────────────────────────────────────
  const [editId, setEditId]           = useState<string | null>(null)
  const [editName, setEditName]       = useState('')
  const [editStart, setEditStart]     = useState('')
  const [editEnd, setEditEnd]         = useState('')
  const [editError, setEditError]     = useState<string | null>(null)

  // ── Suppression ───────────────────────────────────────────
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteError, setDeleteError]         = useState<string | null>(null)

  // ── Activation ────────────────────────────────────────────
  const [activateError, setActivateError] = useState<string | null>(null)

  // ─────────────────────────────────────────────────────────

  function startEdit(season: Season) {
    setEditId(season.id)
    setEditName(season.name)
    setEditStart(season.start_date ?? '')
    setEditEnd(season.end_date ?? '')
    setEditError(null)
  }

  function cancelEdit() {
    setEditId(null)
    setEditError(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    try {
      await createSeason.mutateAsync({
        name,
        start_date: startDate || undefined,
        end_date:   endDate   || undefined,
      })
      setName(''); setStartDate(''); setEndDate('')
      setShowForm(false)
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Erreur lors de la création')
    }
  }

  async function handleSaveEdit(id: string) {
    setEditError(null)
    try {
      await updateSeason.mutateAsync({
        id,
        name:       editName,
        start_date: editStart || null,
        end_date:   editEnd   || null,
      })
      setEditId(null)
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Erreur lors de la modification')
    }
  }

  async function handleDelete(id: string) {
    setDeleteError(null)
    try {
      await deleteSeason.mutateAsync(id)
      setDeleteConfirmId(null)
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Erreur lors de la suppression')
    }
  }

  async function toggleActive(season: Season) {
    if (season.is_active) return
    setActivateError(null)
    try {
      const { error } = await supabase.rpc('set_active_season', { p_season_id: season.id })
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['seasons'] })
    } catch (err: unknown) {
      setActivateError(err instanceof Error ? err.message : "Erreur lors de l'activation")
    }
  }

  async function toggleLock(season: Season) {
    try {
      await updateSeason.mutateAsync({ id: season.id, is_locked: !season.is_locked })
    } catch { /* ignore */ }
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

      {/* Formulaire création */}
      {showForm && (
        <div className="card">
          <h3 className="font-medium text-white mb-4">Créer une saison</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            {createError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
                {createError}
              </div>
            )}
            <div>
              <label className="label">Nom de la saison</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="input" placeholder="Saison 2025-2026" required />
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
                {createSeason.isPending ? <LoadingSpinner size="sm" /> : <Plus size={14} />}
                Créer
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Erreurs globales */}
      {activateError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {activateError}
        </div>
      )}
      {deleteError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {deleteError}
        </div>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
      ) : !seasons?.length ? (
        <div className="card text-center py-12">
          <p className="text-slate-400">Aucune saison créée.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {seasons.map(season => (
            <div key={season.id} className="card space-y-3">

              {/* Mode édition */}
              {editId === season.id ? (
                <div className="space-y-3">
                  {editError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">
                      {editError}
                    </div>
                  )}
                  <div>
                    <label className="label">Nom</label>
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      className="input" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Début</label>
                      <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)} className="input" />
                    </div>
                    <div>
                      <label className="label">Fin</label>
                      <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)} className="input" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(season.id)}
                      disabled={updateSeason.isPending}
                      className="btn-primary flex items-center gap-1.5 text-sm py-1.5"
                    >
                      {updateSeason.isPending ? <LoadingSpinner size="sm" /> : <Save size={13} />}
                      Enregistrer
                    </button>
                    <button onClick={cancelEdit} className="btn-secondary flex items-center gap-1.5 text-sm py-1.5">
                      <X size={13} /> Annuler
                    </button>
                  </div>
                </div>
              ) : (
                /* Mode affichage */
                <div className="flex flex-col gap-3">
                  {/* Infos saison */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white">{season.name}</h3>
                        {season.is_active && (
                          <span className="badge bg-primary-600/20 text-primary-400 border border-primary-600/30">Active</span>
                        )}
                        {season.is_locked && (
                          <span className="badge bg-red-500/20 text-red-400 border border-red-500/30">Verrouillée</span>
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
                  </div>

                  {/* Actions — grille 2 colonnes sur mobile, inline sur desktop */}
                  {deleteConfirmId === season.id ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-red-400 font-medium">Supprimer définitivement ?</span>
                      <button onClick={() => handleDelete(season.id)} disabled={deleteSeason.isPending}
                        className="btn-danger flex items-center gap-1 text-sm py-1.5 px-3">
                        {deleteSeason.isPending ? <LoadingSpinner size="sm" /> : <Check size={13} />}
                        Confirmer
                      </button>
                      <button onClick={() => setDeleteConfirmId(null)}
                        className="btn-secondary flex items-center gap-1 text-sm py-1.5 px-3">
                        <X size={13} /> Annuler
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                      {!season.is_active && (
                        <button onClick={() => toggleActive(season)} disabled={updateSeason.isPending}
                          className="btn-secondary flex items-center justify-center gap-1.5 text-sm py-2">
                          <Check size={13} /> Activer
                        </button>
                      )}
                      <button onClick={() => toggleLock(season)} disabled={updateSeason.isPending}
                        className="btn-secondary flex items-center justify-center gap-1.5 text-sm py-2">
                        {season.is_locked ? <Unlock size={13} /> : <Lock size={13} />}
                        {season.is_locked ? 'Déverrouiller' : 'Verrouiller'}
                      </button>
                      <button onClick={() => startEdit(season)}
                        className="btn-secondary flex items-center justify-center gap-1.5 text-sm py-2">
                        <Pencil size={13} /> Modifier
                      </button>
                      <button onClick={() => setDeleteConfirmId(season.id)}
                        className="btn-danger flex items-center justify-center gap-1.5 text-sm py-2">
                        <Trash2 size={13} /> Supprimer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
