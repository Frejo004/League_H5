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
      <div className="card glass-morphism text-center py-12 border border-white/10">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Aucune saison active.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-white uppercase tracking-wider" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        Paramètres
        <span className="text-[#FFDF73] text-sm ml-2 font-black">— {season.name}</span>
      </h2>

      {isLoading ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider px-4 py-3 rounded-lg">{error}</div>
          )}

          {/* Points system */}
          <div className="relative overflow-hidden p-6 rounded-2xl glass-morphism border border-white/5 space-y-5">
            <h3 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              <span className="w-2 h-2 rounded-full bg-[#FFDF73] shadow-[0_0_5px_#FFDF73]"></span>
              Système de points
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Victoire</label>
                <input type="number" value={pointsWin} onChange={e => setPointsWin(e.target.value)} className="input text-lg font-black tabular-nums py-2 text-center bg-black/40 border-white/10 text-emerald-400" min={0} max={10} required style={{ fontFamily: "'Barlow Condensed', sans-serif" }} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Nul</label>
                <input type="number" value={pointsDraw} onChange={e => setPointsDraw(e.target.value)} className="input text-lg font-black tabular-nums py-2 text-center bg-black/40 border-white/10 text-yellow-400" min={0} max={10} required style={{ fontFamily: "'Barlow Condensed', sans-serif" }} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Défaite</label>
                <input type="number" value={pointsLoss} onChange={e => setPointsLoss(e.target.value)} className="input text-lg font-black tabular-nums py-2 text-center bg-black/40 border-white/10 text-red-400" min={0} max={10} required style={{ fontFamily: "'Barlow Condensed', sans-serif" }} />
              </div>
            </div>
          </div>

          {/* Playoff settings */}
          <div className="relative overflow-hidden p-6 rounded-2xl glass-morphism border border-white/5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white uppercase tracking-widest flex items-center gap-2" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                <span className="w-2 h-2 rounded-full bg-[#FFDF73] shadow-[0_0_5px_#FFDF73]"></span>
                Phase finale (Playoffs)
              </h3>
              <label className="flex items-center gap-2 cursor-pointer bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 hover:bg-white/5 transition-colors">
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
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/10">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Format</label>
                  <select value={playoffFormat} onChange={e => setPlayoffFormat(e.target.value as 'single' | 'two_legs')} className="input text-sm font-medium py-2 bg-black/40 border-white/10">
                    <option value="single">Match unique</option>
                    <option value="two_legs">Aller-retour</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Équipes qualifiées</label>
                  <input type="number" value={teamsInPlayoff} onChange={e => setTeamsInPlayoff(e.target.value)} className="input text-lg font-black tabular-nums py-2 text-center bg-black/40 border-white/10 text-[#FFDF73]" min={2} max={16} required style={{ fontFamily: "'Barlow Condensed', sans-serif" }} />
                </div>
              </div>
            )}
          </div>

          <button type="submit" disabled={upsert.isPending} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto text-sm font-bold uppercase tracking-wider py-3 px-8 shadow-[0_0_15px_rgba(200,241,53,0.3)] hover:shadow-[0_0_20px_rgba(200,241,53,0.5)]">
            {upsert.isPending ? <LoadingSpinner size="sm" /> : <Save size={16} />}
            {saved ? '✓ Sauvegardé !' : 'Sauvegarder'}
          </button>
        </form>
      )}
    </div>
  )
}
