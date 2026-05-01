import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useSettings, useUpsertSettings } from '@/hooks/useSettings'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export function AdminSettingsPage() {
  const { data: season } = useActiveSeason()
  const { data: settings, isLoading } = useSettings(season?.id)
  const upsert = useUpsertSettings()

  const [pointsWin, setPointsWin] = useState('3')
  const [pointsDraw, setPointsDraw] = useState('1')
  const [pointsLoss, setPointsLoss] = useState('0')
  const [playoffEnabled, setPlayoffEnabled] = useState(false)
  const [playoffFormat, setPlayoffFormat] = useState<'single' | 'two_legs'>('single')
  const [teamsInPlayoff, setTeamsInPlayoff] = useState('4')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setPointsWin(String(settings.points_win))
      setPointsDraw(String(settings.points_draw))
      setPointsLoss(String(settings.points_loss))
      setPlayoffEnabled(settings.playoff_enabled)
      setPlayoffFormat(settings.playoff_format)
      setTeamsInPlayoff(String(settings.teams_in_playoff))
    }
  }, [settings])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!season) return
    setError(null)
    try {
      await upsert.mutateAsync({
        season_id: season.id,
        points_win: parseInt(pointsWin),
        points_draw: parseInt(pointsDraw),
        points_loss: parseInt(pointsLoss),
        playoff_enabled: playoffEnabled,
        playoff_format: playoffFormat,
        teams_in_playoff: parseInt(teamsInPlayoff),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde')
    }
  }

  if (!season) {
    return (
      <div className="card text-center py-12">
        <p className="text-slate-400">Aucune saison active.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">
        Paramètres
        <span className="text-slate-400 font-normal text-sm ml-2">— {season.name}</span>
      </h2>

      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}

          {/* Points system */}
          <div className="card space-y-4">
            <h3 className="font-medium text-white">Système de points</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Victoire</label>
                <input type="number" value={pointsWin} onChange={e => setPointsWin(e.target.value)} className="input" min={0} max={10} required />
              </div>
              <div>
                <label className="label">Nul</label>
                <input type="number" value={pointsDraw} onChange={e => setPointsDraw(e.target.value)} className="input" min={0} max={10} required />
              </div>
              <div>
                <label className="label">Défaite</label>
                <input type="number" value={pointsLoss} onChange={e => setPointsLoss(e.target.value)} className="input" min={0} max={10} required />
              </div>
            </div>
          </div>

          {/* Playoff settings */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">Phase finale (Playoffs)</h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={playoffEnabled}
                  onChange={e => setPlayoffEnabled(e.target.checked)}
                  className="w-4 h-4 accent-primary-500"
                />
                <span className="text-sm text-slate-300">Activée</span>
              </label>
            </div>

            {playoffEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Format</label>
                  <select value={playoffFormat} onChange={e => setPlayoffFormat(e.target.value as 'single' | 'two_legs')} className="input">
                    <option value="single">Match unique</option>
                    <option value="two_legs">Aller-retour</option>
                  </select>
                </div>
                <div>
                  <label className="label">Équipes qualifiées</label>
                  <input type="number" value={teamsInPlayoff} onChange={e => setTeamsInPlayoff(e.target.value)} className="input" min={2} max={16} required />
                </div>
              </div>
            )}
          </div>

          <button type="submit" disabled={upsert.isPending} className="btn-primary flex items-center gap-2">
            {upsert.isPending ? <LoadingSpinner size="sm" /> : <Save size={16} />}
            {saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
          </button>
        </form>
      )}
    </div>
  )
}
