import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useMatchBySlug } from '@/hooks/useMatches'

/**
 * Mode "Scoreboard" plein écran pour projection TV / club-house.
 *
 * Vue épurée : pas de header, gros score au centre, noms d'équipes lisibles
 * à plusieurs mètres. Idéal pour projection sur TV dans un club-house ou
 * sur un écran en bord de terrain.
 * Route : /scoreboard/:idOrSlug
 */
export function ScoreboardPage() {
  const { idOrSlug } = useParams<{ idOrSlug: string }>()
  const { data: match, isLoading } = useMatchBySlug(idOrSlug ?? '')

  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white/70 text-2xl">
        Chargement…
      </div>
    )
  }
  if (!match) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 text-white/70">
        <span className="text-2xl">Match introuvable</span>
        <Link to="/" className="text-primary-400 underline">Retour à l'accueil</Link>
      </div>
    )
  }

  const home = match.home_team
  const away = match.away_team
  const isLive = match.status === 'live'
  const minuteLabel = ''
  const statusLabel = isLive
    ? 'EN DIRECT'
    : match.status === 'completed'
      ? 'FINAL'
      : match.scheduled_at
        ? new Date(match.scheduled_at).toLocaleString('fr-FR', {
            weekday: 'short', hour: '2-digit', minute: '2-digit',
            timeZone: 'Africa/Porto-Novo',
          })
        : 'À VENIR'

  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col items-center justify-between py-10 px-6 select-none">
      {/* Barre supérieure (retour + sponsors / branding) */}
      <div className="w-full flex items-center justify-between text-white/40 text-xs uppercase tracking-[0.3em]">
        <Link to={`/matches/${idOrSlug}`} className="flex items-center gap-2 hover:text-white/80 transition-colors">
          <ArrowLeft size={16} /> Retour
        </Link>
        <span>LEAGUE H5 · {new Date(now).toLocaleTimeString('fr-FR', { timeZone: 'Africa/Porto-Novo', hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* Bloc central : équipes + score */}
      <div className="flex-1 w-full flex items-center justify-center">
        <div className="w-full max-w-7xl grid grid-cols-3 items-center gap-8">
          {/* Home */}
          <TeamBlock name={home?.name ?? '—'} logo={home?.logo_url} color={home?.color ?? '#888'} align="end" />

          {/* Score + chrono */}
          <div className="flex flex-col items-center justify-center">
            <div className="text-[14rem] leading-none font-black tabular-nums tracking-tight">
              {match.home_score ?? 0} <span className="text-white/30">–</span> {match.away_score ?? 0}
            </div>
            <div className={clsxStatus(isLive, false)}>
              {statusLabel}
            </div>
          </div>

          {/* Away */}
          <TeamBlock name={away?.name ?? '—'} logo={away?.logo_url} color={away?.color ?? '#888'} align="start" />
        </div>
      </div>

      {/* Bas de page : sponsors / branding */}
      <div className="w-full text-center text-white/30 text-xs uppercase tracking-[0.3em]">
        League H5 · {match.seasons?.name ?? ''}
      </div>
    </div>
  )
}

function TeamBlock({ name, logo, color, align }: { name: string; logo?: string | null; color: string; align: 'start' | 'end' }) {
  return (
    <div className={`flex items-center gap-6 ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
      {align === 'end' && <span className="text-5xl md:text-7xl font-black uppercase tracking-tight" style={{ color }}>{name}</span>}
      <div
        className="w-32 h-32 md:w-40 md:h-40 rounded-3xl flex items-center justify-center shrink-0 shadow-2xl"
        style={{ backgroundColor: color }}
      >
        {logo ? (
          <img src={logo} alt={name} className="w-20 h-20 md:w-24 md:h-24 object-contain" />
        ) : (
          <span className="text-5xl font-black text-white/90">{name.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      {align === 'start' && <span className="text-5xl md:text-7xl font-black uppercase tracking-tight" style={{ color }}>{name}</span>}
    </div>
  )
}

function clsxStatus(isLive: boolean, isPaused: boolean): string {
  const base = 'mt-6 px-8 py-2 rounded-full text-2xl font-black uppercase tracking-[0.3em]'
  if (isLive && !isPaused) return `${base} bg-red-600 text-white animate-pulse`
  if (isPaused) return `${base} bg-amber-500 text-black`
  return `${base} bg-white/10 text-white/80`
}
