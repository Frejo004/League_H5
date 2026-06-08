import { useState } from 'react'
import { Save, Calendar } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useSettings, useUpsertSettings } from '@/hooks/useSettings'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

// ── Sous-composant formulaire — reçoit les settings via props ──────────────────
// Le parent le monte avec une `key` unique dérivée des données, ce qui force
// React à réinitialiser l'état local depuis les props à chaque changement.
interface SettingsData {
  points_win: number
  points_draw: number
  points_loss: number
  playoff_enabled: boolean
  playoff_format: 'single' | 'two_legs'
  teams_in_playoff: number
}

function SettingsForm({ settings, seasonId, seasonName }: {
  settings: SettingsData
  seasonId: string
  seasonName: string
}) {
  const upsert = useUpsertSettings()

  const [pointsWin, setPointsWin] = useState(String(settings.points_win))
  const [pointsDraw, setPointsDraw] = useState(String(settings.points_draw))
  const [pointsLoss, setPointsLoss] = useState(String(settings.points_loss))
  const [playoffEnabled, setPlayoffEnabled] = useState(settings.playoff_enabled)
  const [playoffFormat, setPlayoffFormat] = useState<'single' | 'two_legs'>(settings.playoff_format)
  const [teamsInPlayoff, setTeamsInPlayoff] = useState(String(settings.teams_in_playoff))
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await upsert.mutateAsync({
        season_id: seasonId,
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

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-text-primary uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        Paramètres
        <span className="text-[#FFDF73] text-sm ml-2 font-black">— {seasonName}</span>
      </h2>

      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-lg">{error}</div>
        )}

        {/* Points system */}
        <div className="relative overflow-hidden p-6 rounded-2xl glass-morphism border border-surface-border space-y-5">
          <h3 className="text-base font-black text-text-primary uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            <span className="w-2 h-2 rounded-full bg-[#FFDF73] shadow-[0_0_5px_#FFDF73]"></span>
            Système de points
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Victoire</label>
              <input type="number" value={pointsWin} onChange={e => setPointsWin(e.target.value)} className="input text-lg font-black tabular-nums py-2 text-center bg-surface/50 border-surface-border text-emerald-500 hover:border-surface-muted" min={0} max={10} required style={{ fontFamily: "'Barlow Condensed', sans-serif" }} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Nul</label>
              <input type="number" value={pointsDraw} onChange={e => setPointsDraw(e.target.value)} className="input text-lg font-black tabular-nums py-2 text-center bg-surface/50 border-surface-border text-amber-500 hover:border-surface-muted" min={0} max={10} required style={{ fontFamily: "'Barlow Condensed', sans-serif" }} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Défaite</label>
              <input type="number" value={pointsLoss} onChange={e => setPointsLoss(e.target.value)} className="input text-lg font-black tabular-nums py-2 text-center bg-surface/50 border-surface-border text-red-500 hover:border-surface-muted" min={0} max={10} required style={{ fontFamily: "'Barlow Condensed', sans-serif" }} />
            </div>
          </div>
        </div>
        
        {/* Playoff settings */}
        <div className="relative overflow-hidden p-6 rounded-2xl glass-morphism border border-surface-border space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-text-primary uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              <span className="w-2 h-2 rounded-full bg-[#FFDF73] shadow-[0_0_5px_#FFDF73]"></span>
              Phase finale (Playoffs)
            </h3>
            <label className="flex items-center gap-2 cursor-pointer bg-surface/50 px-3 py-1.5 rounded-lg border border-surface-border hover:bg-surface-raised transition-colors">
              <input
                type="checkbox"
                checked={playoffEnabled}
                onChange={e => setPlayoffEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#FFDF73]"
              />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 mt-0.5">Activée</span>
            </label>
          </div>

          {playoffEnabled && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-surface-border">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Format</label>
                <select value={playoffFormat} onChange={e => setPlayoffFormat(e.target.value as 'single' | 'two_legs')} className="input text-sm font-medium py-2 bg-surface/50 border-surface-border">
                  <option value="single">Match unique</option>
                  <option value="two_legs">Aller-retour</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Équipes qualifiées</label>
                <input type="number" value={teamsInPlayoff} onChange={e => setTeamsInPlayoff(e.target.value)} className="input text-lg font-black tabular-nums py-2 text-center bg-surface/50 border-surface-border text-[#FFDF73]" min={2} max={16} required style={{ fontFamily: "'Barlow Condensed', sans-serif" }} />
              </div>
            </div>
          )}
        </div>

        {/* Info Delegation */}
        <div className="p-6 rounded-2xl bg-primary-500/5 border border-primary-500/20 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary-500/10 text-primary-500">
              <Calendar size={18} />
            </div>
            <h3 className="text-sm font-black text-text-primary uppercase tracking-widest" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              Délégation des accès Live
            </h3>
          </div>
          <p className="text-[11px] text-text-muted font-medium leading-relaxed">
            Pour accorder les droits de saisie (événements ou vidéo) à un joueur, rendez-vous dans l'onglet <strong>Calendrier</strong> de l'administration et modifiez le match concerné.
          </p>
        </div>

        <button type="submit" disabled={upsert.isPending} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto text-sm font-bold uppercase tracking-wider py-3 px-8 shadow-[0_0_15px_rgba(200,241,53,0.3)] hover:shadow-[0_0_20px_rgba(200,241,53,0.5)]">
          {upsert.isPending ? <LoadingSpinner size="sm" /> : <Save size={16} />}
          {saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
        </button>
      </form>
    </div>
  )
}

// ── Composant parent — gère le chargement et passe les données au formulaire ───
export function AdminSettingsPage() {
  const { data: season } = useActiveSeason()
  const { data: settings, isLoading } = useSettings(season?.id)

  if (!season) {
    return (
      <div className="card glass-morphism text-center py-12 border border-surface-border">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Aucune saison active.</p>
      </div>
    )
  }

  if (isLoading) {
    return <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
  }

  // La `key` force React à remonter SettingsForm (et donc réinitialiser son état)
  // chaque fois que les settings changent depuis la BDD, sans useEffect.
  const settingsKey = settings
    ? `${settings.points_win}-${settings.points_draw}-${settings.points_loss}-${settings.playoff_enabled}-${settings.playoff_format}-${settings.teams_in_playoff}`
    : 'defaults'

  return (
    <SettingsForm
      key={settingsKey}
      settings={settings ?? {
        points_win: 3,
        points_draw: 1,
        points_loss: 0,
        playoff_enabled: false,
        playoff_format: 'single',
        teams_in_playoff: 4,
      }}
      seasonId={season.id}
      seasonName={season.name}
    />
  )
}
