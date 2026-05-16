import { useParams, Link } from 'react-router-dom'
import { Target, Zap, Calendar, Star, GitCompare, TrendingUp } from 'lucide-react'
import { usePlayerProfile } from '@/hooks/usePlayerProfile'
import { usePlayerMvp } from '@/hooks/useMvpVotes'
import { useScorers } from '@/hooks/useScorers'
import { useActiveSeason } from '@/hooks/useSeasons'
import { SkeletonPlayerProfile } from '@/components/ui/SkeletonLoader'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { POSITION_LABELS, ResultBadge } from '@/components/ui/SharedBadges'
import { clsx } from 'clsx'
import { useMemo, useState } from 'react'


function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  }).format(new Date(dateStr))
}

// ── Graphique buts + passes par journée ──────────────────────────────────────
function PlayerFormChart({ matches, teamColor }: {
  matches: Array<{
    matchday: number
    goals_in_match: number
    assists_in_match: number
    result: 'W' | 'D' | 'L'
  }>
  teamColor?: string
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const data = useMemo(() => {
    return [...matches].sort((a, b) => a.matchday - b.matchday)
  }, [matches])

  if (data.length === 0) return null

  const maxVal = Math.max(...data.map(m => Math.max(m.goals_in_match, m.assists_in_match)), 1)

  // Dimensions SVG
  const W = 400
  const H = 140
  const PAD = { top: 16, right: 16, bottom: 28, left: 24 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  // Si un seul point, on le centre
  const xScale = (i: number) =>
    data.length === 1
      ? PAD.left + cW / 2
      : PAD.left + (i / (data.length - 1)) * cW

  const yScale = (v: number) => PAD.top + cH - (v / maxVal) * cH

  const buildPath = (key: 'goals_in_match' | 'assists_in_match') =>
    data.map((m, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(m[key]).toFixed(1)}`).join(' ')

  const goalsPath   = buildPath('goals_in_match')
  const assistsPath = buildPath('assists_in_match')

  const RESULT_COLORS = { W: '#22c55e', D: '#f59e0b', L: '#ef4444' }

  // Grille Y : 0, mi, max
  const yTicks = maxVal === 1 ? [0, 1] : [0, Math.ceil(maxVal / 2), maxVal]

  const hovered = hoveredIdx !== null ? data[hoveredIdx] : null

  return (
    <div className="card space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={13} className="text-slate-400" />
          <p className="text-xs font-black text-white uppercase tracking-widest">Contributions par journée</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
            <span className="text-[10px] text-slate-500 font-bold">Buts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-400" />
            <span className="text-[10px] text-slate-500 font-bold">Passes</span>
          </div>
        </div>
      </div>

      {/* Tooltip hover */}
      {hovered && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-xs animate-fade-in">
          <span className="font-black text-slate-400 uppercase tracking-wider">J{hovered.matchday}</span>
          <span className={clsx(
            'text-[10px] font-black px-1.5 py-0.5 rounded uppercase',
            hovered.result === 'W' ? 'bg-green-500/20 text-green-400' :
            hovered.result === 'L' ? 'bg-red-500/20 text-red-400' :
            'bg-slate-500/20 text-slate-400'
          )}>
            {hovered.result === 'W' ? 'Victoire' : hovered.result === 'L' ? 'Défaite' : 'Nul'}
          </span>
          <span className="text-orange-400 font-black">
            ⚽ {hovered.goals_in_match}
          </span>
          <span className="text-violet-400 font-black">
            🅰 {hovered.assists_in_match}
          </span>
        </div>
      )}

      {/* SVG */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ maxHeight: 140 }}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {/* Grille horizontale + labels Y */}
          {yTicks.map(tick => (
            <g key={tick}>
              <line
                x1={PAD.left} y1={yScale(tick)}
                x2={W - PAD.right} y2={yScale(tick)}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1"
              />
              <text
                x={PAD.left - 4} y={yScale(tick) + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.2)"
                fontSize="7"
                fontFamily="monospace"
              >
                {tick}
              </text>
            </g>
          ))}

          {/* Bandes résultats en fond */}
          {data.map((m, i) => {
            const bw = data.length === 1 ? cW : cW / (data.length - 1)
            return (
              <rect
                key={i}
                x={xScale(i) - bw / 2}
                y={PAD.top}
                width={bw}
                height={cH}
                fill={RESULT_COLORS[m.result]}
                opacity={hoveredIdx === i ? 0.12 : 0.05}
              />
            )
          })}

          {/* Zone remplie passes (fond) */}
          {data.length > 1 && (
            <path
              d={`${assistsPath} L ${xScale(data.length - 1).toFixed(1)} ${(PAD.top + cH).toFixed(1)} L ${xScale(0).toFixed(1)} ${(PAD.top + cH).toFixed(1)} Z`}
              fill="#a78bfa"
              opacity={0.06}
            />
          )}

          {/* Zone remplie buts (fond) */}
          {data.length > 1 && (
            <path
              d={`${goalsPath} L ${xScale(data.length - 1).toFixed(1)} ${(PAD.top + cH).toFixed(1)} L ${xScale(0).toFixed(1)} ${(PAD.top + cH).toFixed(1)} Z`}
              fill="#fb923c"
              opacity={0.08}
            />
          )}

          {/* Ligne passes */}
          {data.length > 1 && (
            <path
              d={assistsPath}
              fill="none"
              stroke="#a78bfa"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.7}
            />
          )}

          {/* Ligne buts */}
          {data.length > 1 && (
            <path
              d={goalsPath}
              fill="none"
              stroke="#fb923c"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points passes */}
          {data.map((m, i) => (
            <circle
              key={`a-${i}`}
              cx={xScale(i)}
              cy={yScale(m.assists_in_match)}
              r={hoveredIdx === i ? 4 : m.assists_in_match > 0 ? 2.5 : 1.5}
              fill={m.assists_in_match > 0 ? '#a78bfa' : 'rgba(167,139,250,0.3)'}
              className="transition-all duration-150"
            />
          ))}

          {/* Points buts */}
          {data.map((m, i) => (
            <circle
              key={`g-${i}`}
              cx={xScale(i)}
              cy={yScale(m.goals_in_match)}
              r={hoveredIdx === i ? 5 : m.goals_in_match > 0 ? 3.5 : 2}
              fill={m.goals_in_match > 0 ? '#fb923c' : 'rgba(251,146,60,0.3)'}
              className="transition-all duration-150"
            />
          ))}

          {/* Zones de hover invisibles */}
          {data.map((m, i) => {
            const bw = data.length === 1 ? cW : cW / (data.length - 1)
            return (
              <rect
                key={`hover-${i}`}
                x={xScale(i) - bw / 2}
                y={PAD.top}
                width={bw}
                height={cH}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
              />
            )
          })}

          {/* Ligne verticale hover */}
          {hoveredIdx !== null && (
            <line
              x1={xScale(hoveredIdx)} y1={PAD.top}
              x2={xScale(hoveredIdx)} y2={PAD.top + cH}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          )}

          {/* Labels journées */}
          {data.map((m, i) => (
            <text
              key={`lbl-${i}`}
              x={xScale(i)}
              y={H - 6}
              textAnchor="middle"
              fill={hoveredIdx === i ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)'}
              fontSize="7"
              fontFamily="monospace"
              fontWeight={hoveredIdx === i ? 'bold' : 'normal'}
            >
              J{m.matchday}
            </text>
          ))}
        </svg>
      </div>

      {/* Résumé sous le graphique */}
      <div className="flex items-center gap-4 pt-1 border-t border-surface-border/30">
        {[
          { label: 'Victoires', count: data.filter(m => m.result === 'W').length, color: 'bg-green-500' },
          { label: 'Nuls',      count: data.filter(m => m.result === 'D').length, color: 'bg-amber-500' },
          { label: 'Défaites',  count: data.filter(m => m.result === 'L').length, color: 'bg-red-500'   },
        ].map(({ label, count, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={clsx('w-2 h-2 rounded-sm', color, 'opacity-70')} />
            <span className="text-[10px] text-slate-500 font-bold">{count} {label}</span>
          </div>
        ))}
        <div className="ml-auto text-[10px] text-slate-600 font-bold">
          {data.length} match{data.length > 1 ? 's' : ''}
        </div>
      </div>
    </div>
  )
}

export function PlayerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { data: season } = useActiveSeason()
  const { data: player, isLoading } = usePlayerProfile(id)
  const { data: scorers } = useScorers(season?.id)
  const { data: mvpData } = usePlayerMvp(id, season?.id)

  if (isLoading) {
    return <SkeletonPlayerProfile />
  }

  if (!player) {
    return (
      <div className="card text-center py-16">
        <p className="text-slate-400">Joueur introuvable.</p>
        <Link to="/players" className="btn-secondary mt-4 inline-flex">← Retour</Link>
      </div>
    )
  }

  // Rang dans les buteurs
  const scorerRank = scorers?.findIndex(s => s.player_id === id)
  const rankDisplay = scorerRank !== undefined && scorerRank >= 0 ? scorerRank + 1 : null

  return (
    <div className="space-y-3 pb-10 animate-fade-in-up">

      {/* Navigation */}
      <Breadcrumbs items={[
        { label: 'Joueurs', to: '/players' },
        { label: `${player.first_name} ${player.last_name}` }
      ]} />

      {/* ── Hero card ── */}
      <div className="card">
        <div className="flex items-center gap-4">

          {/* Avatar / initiales */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center
                       text-white text-xl font-bold shrink-0 ring-2 ring-surface-border"
            style={{ backgroundColor: player.team.color }}
          >
            {player.avatar_url
              ? <img src={player.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
              : `${player.first_name[0]}${player.last_name[0]}`
            }
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">
                {player.first_name} {player.last_name}
              </h1>
              {player.jersey_number && (
                <span className="badge bg-surface-raised text-slate-400 border border-surface-border text-xs">
                  #{player.jersey_number}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {/* Équipe */}
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: player.team.color }} />
                <span className="text-sm text-slate-400">{player.team.name}</span>
              </div>

              {/* Poste */}
              {player.position && (
                <span className="text-sm text-slate-500">
                  {POSITION_LABELS[player.position] ?? player.position}
                </span>
              )}
            </div>
          </div>

          {/* Rang buteur */}
          {rankDisplay && (
            <div className="text-center shrink-0">
              <p className="text-2xl font-bold text-orange-400">#{rankDisplay}</p>
              <p className="text-[10px] text-slate-600 uppercase tracking-wider">Buteurs</p>
            </div>
          )}

          {/* Bouton comparer */}
          <Link
            to="/players"
            state={{ compareWith: id }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors text-[10px] font-black uppercase tracking-wider shrink-0"
            title="Comparer avec un autre joueur"
          >
            <GitCompare size={13} />
            <span className="hidden sm:block">Comparer</span>
          </Link>
        </div>
      </div>

      {/* ── Stats saison ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Matchs joués', value: player.matches_played,  icon: Calendar, color: 'text-blue-400'   },
          { label: 'Buts',         value: player.goals,           icon: Target,   color: 'text-orange-400' },
          { label: 'Passes déc.',  value: player.assists,         icon: Zap,      color: 'text-violet-400' },
          { label: 'Homme du match', value: mvpData?.total_mvp ?? 0, icon: Star,  color: 'text-amber-400'  },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={clsx(
            'stat-card text-center',
            label === 'Homme du match' && (mvpData?.total_mvp ?? 0) > 0 && 'border-amber-500/30 bg-amber-500/5'
          )}>
            <Icon size={16} className={clsx('mx-auto mb-1.5', color)} />
            <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Graphique contributions ── */}
      {player.recent_matches.length >= 1 && (
        <PlayerFormChart matches={player.recent_matches} teamColor={player.team.color} />
      )}

      {/* ── Derniers matchs ── */}
      {player.recent_matches.length > 0 && (
        <div className="card p-0 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-surface-border bg-surface-raised">
            <p className="section-title">Derniers matchs</p>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 px-4 py-2 border-b border-surface-border/50">
            <span className="section-title w-12 text-center">Date</span>
            <span className="section-title">Match</span>
            <span className="section-title w-8 text-center">Rés.</span>
            <span className="section-title w-6 text-center text-orange-400/70">⚽</span>
            <span className="section-title w-6 text-center text-violet-400/70">🅰</span>
          </div>

          {player.recent_matches.map((m, i) => {
            const isHome = m.home_team.id === player.team_id
            const opponent = isHome ? m.away_team : m.home_team
            const myScore  = isHome ? m.home_score : m.away_score
            const oppScore = isHome ? m.away_score : m.home_score

            return (
              <Link
                key={m.match_id}
                to={`/matches/${m.match_id}`}
                className={clsx(
                  'grid grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center px-4 py-2.5',
                  'hover:bg-surface-raised transition-colors',
                  i < player.recent_matches.length - 1 && 'border-b border-surface-border/30'
                )}
              >
                {/* Date */}
                <span className="text-xs text-slate-600 w-12 text-center tabular-nums">
                  {formatDate(m.played_at)}
                </span>

                {/* Match */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: opponent.color }} />
                  <span className="text-sm text-slate-300 truncate">{opponent.name}</span>
                  <span className="text-xs text-slate-600 shrink-0">
                    {isHome ? 'Dom.' : 'Ext.'}
                  </span>
                  <span className="text-xs font-bold text-slate-400 tabular-nums shrink-0">
                    {myScore}–{oppScore}
                  </span>
                </div>

                {/* Résultat */}
                <div className="flex justify-center w-8">
                  <ResultBadge result={m.result} />
                </div>

                {/* Buts */}
                <div className="w-6 text-center">
                  {m.goals_in_match > 0 ? (
                    <span className="text-sm font-bold text-orange-400">{m.goals_in_match}</span>
                  ) : (
                    <span className="text-xs text-slate-700">—</span>
                  )}
                </div>

                {/* Passes */}
                <div className="w-6 text-center">
                  {m.assists_in_match > 0 ? (
                    <span className="text-sm font-bold text-violet-400">{m.assists_in_match}</span>
                  ) : (
                    <span className="text-xs text-slate-700">—</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {player.recent_matches.length === 0 && (
        <div className="card">
          <div className="empty-state py-6">
            <div className="empty-state-icon"><Calendar size={18} /></div>
            <p className="text-slate-500 text-sm">Aucun match joué cette saison.</p>
          </div>
        </div>
      )}

      {/* ── Matchs MVP ── */}
      {(mvpData?.total_mvp ?? 0) > 0 && (
        <div className="card p-0 overflow-hidden border-amber-500/20">
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-surface-border bg-amber-500/5">
            <Star size={14} className="text-amber-400 fill-amber-400/40 shrink-0" />
            <p className="section-title text-amber-500/80">
              Homme du match · {mvpData!.total_mvp} fois
            </p>
          </div>

          {mvpData!.mvp_matches.map((m, i) => (
            <Link
              key={m.match_id}
              to={`/matches/${m.match_id}`}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 hover:bg-surface-raised transition-colors',
                i < mvpData!.mvp_matches.length - 1 && 'border-b border-surface-border/30'
              )}
            >
              {/* Étoile */}
              <Star size={14} className="text-amber-400 fill-amber-400 shrink-0" />

              {/* Infos match */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {m.home_team_name} <span className="text-slate-500 font-normal">vs</span> {m.away_team_name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Journée {m.matchday}
                  {m.played_at && (
                    <> · {new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(m.played_at))}</>
                  )}
                </p>
              </div>

              {/* Score */}
              <span className="text-sm font-bold text-white tabular-nums shrink-0">
                {m.home_score} – {m.away_score}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
