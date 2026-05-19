import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar, MapPin, ChevronRight, ChevronLeft,
  Play, Radio, Clock, Trophy, Zap
} from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useMatches, type MatchWithTeams } from '@/hooks/useMatches'
import { useRealtimeTeams, useRealtimeMatches } from '@/hooks/useRealtime'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { PublicLayout } from '@/components/layout/PublicLayout'

// ─── helpers ─────────────────────────────────────────────────────────────────
function fHour(s: string | null) {
  if (!s) return '—'
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(s))
}
function fDay(s: string | null) {
  if (!s) return '—'
  const d = new Date(s)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tom = new Date(today); tom.setDate(today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === tom.toDateString()) return 'Demain'
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(d)
}

// ─── animated counter ────────────────────────────────────────────────────────
function AnimCounter({ target, live }: { target: number; live?: boolean }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!target) { setV(0); return }
    let cur = 0
    const step = Math.max(1, Math.ceil(target / 20))
    const id = setInterval(() => {
      cur = Math.min(cur + step, target)
      setV(cur)
      if (cur >= target) clearInterval(id)
    }, 36)
    return () => clearInterval(id)
  }, [target])
  return (
    <span style={{
      fontSize: 'clamp(1.2rem, 4vw, 2rem)', fontWeight: 900, fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-.04em', fontFamily: "'Barlow Condensed',sans-serif",
      color: live && target > 0 ? '#ef4444' : 'var(--t1)', transition: 'color .3s'
    }}>
      {v}{live && target > 0 && <span style={{ fontSize: '.6rem', marginLeft: 2 }}>🔴</span>}
    </span>
  )
}

// ─── stat pill ───────────────────────────────────────────────────────────────
function StatPill({ value, label, live }: { value: number; label: string; live?: boolean }) {
  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '8px 10px', borderRadius: 16, border: '1px solid var(--bd)',
        background: 'var(--bg-pill)', cursor: 'default', transition: 'background .2s'
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-pill-h)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-pill)')}
    >
      <AnimCounter target={value} live={live} />
      <span style={{
        fontSize: 'clamp(0.6rem, 2vw, 0.75rem)', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '.12em', color: 'var(--tm)', marginTop: 4,
        fontFamily: "'DM Sans',sans-serif"
      }}>{label}</span>
    </div>
  )
}

// ─── team block ──────────────────────────────────────────────────────────────
function TeamBlock({ name, color, logoUrl, won, align }:
  { name: string; color: string; logoUrl: string | null; won: boolean; align: 'left' | 'right' }
) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'clamp(4px, 1.5vw, 10px)', flex: 1, minWidth: 0,
      flexDirection: align === 'right' ? 'row-reverse' : 'row'
    }}>
      <div style={{
        width: 'clamp(30px, 8vw, 48px)', height: 'clamp(30px, 8vw, 48px)', borderRadius: 12, flexShrink: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', backgroundColor: color,
        color: '#fff', fontWeight: 900, fontSize: 14, boxShadow: '0 2px 7px rgba(0,0,0,.18)'
      }}>
        {logoUrl
          ? <img src={logoUrl} alt={name} style={{ width: '70%', height: '70%', objectFit: 'contain', borderRadius: 8 }} />
          : name[0]}
      </div>
      <span style={{
        fontSize: 'clamp(0.75rem, 2.5vw, 0.9rem)', fontWeight: 700, lineHeight: 1.3, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        textAlign: align === 'right' ? 'right' : 'left',
        color: won ? 'var(--t1)' : 'var(--t2)', transition: 'color .3s',
        fontFamily: "'DM Sans',sans-serif"
      }}>
        {name}
      </span>
    </div>
  )
}

// ─── score center ────────────────────────────────────────────────────────────
function ScoreCenter({ match }: { match: MatchWithTeams }) {
  const isCompleted = match.status === 'completed'
  const isCancelled = match.status === 'cancelled'
  const isLive = match.status === 'live'
  const homeWon = isCompleted && (match.home_score ?? 0) > (match.away_score ?? 0)
  const awayWon = isCompleted && (match.away_score ?? 0) > (match.home_score ?? 0)

  const numStyle = (bold: boolean): React.CSSProperties => ({
    fontSize: 'clamp(1.2rem, 4vw, 1.6rem)', fontWeight: 900, fontVariantNumeric: 'tabular-nums',
    fontFamily: "'Barlow Condensed',sans-serif", transition: 'color .3s',
    color: bold ? 'var(--t1)' : 'var(--t2)'
  })

  if (isLive) return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'clamp(6px, 2vw, 10px)',
      background: 'rgba(239,68,68,.13)', padding: '6px 12px', borderRadius: 12,
      border: '1px solid rgba(239,68,68,.28)', boxShadow: 'var(--sh-live)'
    }}>
      <span style={{ ...numStyle(true), color: 'var(--t1)' }}>{match.home_score ?? 0}</span>
      <span style={{ color: 'rgba(239,68,68,.4)', fontSize: '.85rem', fontWeight: 900 }}>:</span>
      <span style={{ ...numStyle(true), color: 'var(--t1)' }}>{match.away_score ?? 0}</span>
    </div>
  )
  if (isCompleted) return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'clamp(6px, 2vw, 10px)',
      background: 'var(--bg-pill)', padding: '6px 12px', borderRadius: 12, border: '1px solid var(--bd)'
    }}>
      <span style={numStyle(homeWon)}>{match.home_score}</span>
      <span style={{ color: 'var(--tm)', fontSize: '.85rem' }}>:</span>
      <span style={numStyle(awayWon)}>{match.away_score}</span>
    </div>
  )
  if (isCancelled) return (
    <div style={{
      background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.18)',
      padding: '6px 12px', borderRadius: 10
    }}>
      <span style={{
        fontSize: '.75rem', fontWeight: 900, color: '#f87171',
        textTransform: 'uppercase', letterSpacing: '.1em'
      }}>Annulé</span>
    </div>
  )
  if (match.scheduled_at) return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'var(--bg-pill)', border: '1px solid var(--bd)', padding: '8px 16px', borderRadius: 12
    }}>
      <span style={{
        fontSize: '1rem', fontWeight: 900, color: 'var(--t1)',
        fontVariantNumeric: 'tabular-nums', fontFamily: "'Barlow Condensed',sans-serif",
        transition: 'color .3s'
      }}>{fHour(match.scheduled_at)}</span>
      <span style={{
        fontSize: '.75rem', color: 'var(--tm)', fontWeight: 600, marginTop: 2,
        display: 'flex', alignItems: 'center', gap: 4, fontFamily: "'DM Sans',sans-serif"
      }}>
        <Calendar size={10} />{fDay(match.scheduled_at)}
      </span>
    </div>
  )
  return null
}

// ─── match card ──────────────────────────────────────────────────────────────
function MatchCard({ match, index }: { match: MatchWithTeams; index: number }) {
  const isCompleted = match.status === 'completed'
  const isLive = match.status === 'live'
  const homeWon = isCompleted && (match.home_score ?? 0) > (match.away_score ?? 0)
  const awayWon = isCompleted && (match.away_score ?? 0) > (match.home_score ?? 0)

  return (
    <Link to={`/public/matches/${match.slug ?? match.id}`}
      className="ci" style={{ display: 'block', textDecoration: 'none', animationDelay: `${index * 55}ms` }}>
      <div className={isLive ? 'lr' : ''} style={{
        position: 'relative', borderRadius: 14, overflow: 'hidden',
        border: `1px solid ${isLive ? 'rgba(239,68,68,.32)' : 'var(--bd-card)'}`,
        background: isLive ? 'rgba(239,68,68,.04)' : 'var(--bg-surface)',
        boxShadow: 'var(--sh-card)', transition: 'transform .2s ease,box-shadow .2s ease,background .3s ease'
      }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement
          el.style.transform = 'translateY(-2px)'
          el.style.boxShadow = 'var(--sh-hover)'
          el.style.background = isLive ? 'rgba(239,68,68,.07)' : 'var(--bg-surface-h)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement
          el.style.transform = 'translateY(0)'
          el.style.boxShadow = 'var(--sh-card)'
          el.style.background = isLive ? 'rgba(239,68,68,.04)' : 'var(--bg-surface)'
        }}
      >
        {isLive && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: 'linear-gradient(90deg,transparent,#ef4444,transparent)'
          }} />
        )}

        <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 min-w-0">
          <TeamBlock name={match.home_team.name} color={match.home_team.color}
            logoUrl={match.home_team.logo_url} won={homeWon} align="left" />

          <div className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 min-w-[50px] sm:min-w-[70px]">
            <ScoreCenter match={match} />

            {isLive && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8 }}>
                  <span className="animate-ping" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#f87171', opacity: .75 }} />
                  <span style={{ position: 'relative', width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-flex' }} />
                </span>
                <span style={{
                  fontSize: '.7rem', fontWeight: 900, color: '#f87171',
                  textTransform: 'uppercase', letterSpacing: '.2em'
                }}>Live</span>
              </div>
            )}
            {isCompleted && !homeWon && !awayWon && (
              <span style={{
                fontSize: '.7rem', fontWeight: 700, color: 'var(--tm)',
                textTransform: 'uppercase', letterSpacing: '.15em'
              }}>Nul</span>
            )}
          </div>

          <TeamBlock name={match.away_team.name} color={match.away_team.color}
            logoUrl={match.away_team.logo_url} won={awayWon} align="right" />

          <ChevronRight size={16} className="text-[var(--tm)] shrink-0 transition-colors ml-1 sm:ml-2" />
        </div>

        {match.venue && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            paddingBottom: 12, marginTop: -4, fontSize: '.75rem', color: 'var(--tm)',
            fontFamily: "'DM Sans',sans-serif"
          }}>
            <MapPin size={10} />{match.venue}
          </div>
        )}
      </div>
    </Link>
  )
}

// ─── filter tabs ─────────────────────────────────────────────────────────────
type TabKey = 'all' | 'live' | 'upcoming' | 'completed' | 'cancelled'
type Tab = { key: TabKey; label: string; icon: typeof Radio; count?: number }

function FilterTabs({ tabs, active, onChange }:
  { tabs: Tab[]; active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <div className="ns" style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: 6,
      borderRadius: 16, background: 'var(--bg-tabs)', border: '1px solid var(--bd)', overflowX: 'auto'
    }}>
      {tabs.map(tab => {
        const on = active === tab.key
        return (
          <button key={tab.key} onClick={() => onChange(tab.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 12,
            fontSize: '.85rem', fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer',
            border: 'none', outline: 'none',
            background: on ? 'var(--bg-tab-on)' : 'transparent',
            color: on ? 'var(--t1)' : 'var(--tm)',
            boxShadow: on ? 'var(--sh-card)' : 'none',
            transition: 'all .18s ease', fontFamily: "'DM Sans',sans-serif"
          }}>
            <tab.icon size={14} />
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                fontSize: '.75rem', fontWeight: 900, padding: '2px 8px', borderRadius: 6,
                background: 'var(--bg-pill)', color: on ? 'var(--t1)' : 'var(--tm)'
              }}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── empty ───────────────────────────────────────────────────────────────────
function Empty({ icon: Icon, message }: { icon: typeof Calendar; message: string }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 10, opacity: .45
    }}>
      <Icon size={28} style={{ color: 'var(--tm)' }} />
      <p style={{
        fontSize: '.62rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '.15em', color: 'var(--tm)', fontFamily: "'DM Sans',sans-serif", margin: 0
      }}>
        {message}
      </p>
    </div>
  )
}


// ─── page ────────────────────────────────────────────────────────────────────
const PER_PAGE = 6

export function PublicMatchesPage() {
  const { data: season, isLoading: sl } = useActiveSeason()
  const { data: matches, isLoading: ml } = useMatches(season?.id)

  useRealtimeTeams(season?.id)
  useRealtimeMatches(season?.id)

  // theme — respects system preference, persists
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const s = localStorage.getItem('mr-theme')
    return s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    const handleTheme = () => {
      const s = localStorage.getItem('mr-theme')
      setDark(s ? s === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
    window.addEventListener('theme-changed', handleTheme)
    return () => window.removeEventListener('theme-changed', handleTheme)
  }, [])

  const isLoading = sl || ml
  const allMatches = useMemo(() => matches ?? [], [matches])

  const liveCount = useMemo(() => allMatches.filter(m => m.status === 'live').length, [allMatches])
  const upcoming = useMemo(() => allMatches.filter(m => m.status === 'scheduled'), [allMatches])
  const completed = useMemo(() => allMatches.filter(m => m.status === 'completed'), [allMatches])
  const cancelled = useMemo(() => allMatches.filter(m => m.status === 'cancelled'), [allMatches])

  const [filter, setFilter] = useState<TabKey>(() => liveCount > 0 ? 'live' : 'all')
  const [page, setPage] = useState(1)
  const handleFilter = (k: TabKey) => { setFilter(k); setPage(1) }

  const visible = useMemo(() => {
    switch (filter) {
      case 'live': return allMatches.filter(m => m.status === 'live')
      case 'upcoming': return allMatches.filter(m => m.status === 'scheduled')
      case 'completed': return allMatches.filter(m => m.status === 'completed')
      case 'cancelled': return allMatches.filter(m => m.status === 'cancelled')
      default: return allMatches.filter(m => m.status !== 'cancelled')
    }
  }, [filter, allMatches])

  const totalPages = Math.max(1, Math.ceil(visible.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const paginated = visible.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  const tabs: Tab[] = [
    { key: 'all', label: 'Tous', icon: Calendar, count: undefined },
    { key: 'live', label: 'Live', icon: Play, count: liveCount || undefined },
    { key: 'upcoming', label: 'À venir', icon: Clock, count: upcoming.length || undefined },
    { key: 'completed', label: 'Résultats', icon: Trophy, count: completed.length || undefined },
    ...(cancelled.length > 0 ? [{ key: 'cancelled' as TabKey, label: 'Annulés', icon: Zap, count: cancelled.length }] : []),
  ]

  return (
    <PublicLayout hideFooter>
      <div className={`mr${dark ? ' dark' : ''} flex-1 flex justify-center overflow-hidden w-full`} style={{
        background: 'var(--bg)', transition: 'background .35s ease'
      }}>
        <div className="flex flex-col h-full w-full max-w-5xl box-border p-4 md:p-6 gap-4 md:gap-6">

          {/* ── HEADER ────────────────────────────────────────────────── */}
          <div style={{
            flexShrink: 0, position: 'relative', borderRadius: 20, overflow: 'hidden',
            border: '1px solid var(--bd)',
            background: dark
              ? 'linear-gradient(135deg,rgba(28,38,58,.55) 0%,rgba(8,11,18,0) 70%)'
              : 'linear-gradient(135deg,rgba(200,241,53,.07) 0%,rgba(248,250,252,0) 65%)',
            transition: 'background .35s,border-color .35s'
          }}>
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 260, height: 110, pointerEvents: 'none',
              background: 'radial-gradient(ellipse at 50% 0%,rgba(200,241,53,.1) 0%,transparent 65%)'
            }} />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 sm:gap-6">

              {/* left */}
              <div style={{ minWidth: 0 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '2px 9px', borderRadius: 999,
                  background: 'var(--accent-dim)', border: '1px solid var(--accent-border)', marginBottom: 5
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{
                    fontSize: '.57rem', fontWeight: 900, color: 'var(--accent)',
                    textTransform: 'uppercase', letterSpacing: '.25em', fontFamily: "'DM Sans',sans-serif"
                  }}>
                    {season?.name ?? 'Saison en cours'}
                  </span>
                </div>
                <h1 style={{
                  fontFamily: "'Barlow Condensed',sans-serif",
                  fontSize: 'clamp(2rem,6vw,3.5rem)', fontWeight: 900,
                  color: 'var(--t1)', letterSpacing: '-.01em', lineHeight: 1, margin: 0, transition: 'color .3s'
                }}>
                  MATCHS
                </h1>
                <p style={{
                  fontSize: '.85rem', color: 'var(--tm)', marginTop: 4,
                  fontFamily: "'DM Sans',sans-serif", transition: 'color .3s'
                }}>
                  Programme · résultats · direct
                </p>
              </div>

              {/* right */}
              <div className="flex flex-col items-start sm:items-end gap-2 shrink-0 w-full sm:w-auto">
                {!isLoading && allMatches.length > 0 && (
                  <div className="flex gap-2 w-full sm:w-auto">
                    <StatPill value={liveCount} label="Live" live />
                    <StatPill value={upcoming.length} label="À venir" />
                    <StatPill value={completed.length} label="Terminés" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── FILTER TABS ───────────────────────────────────────────── */}
          {!isLoading && allMatches.length > 0 && (
            <div style={{ flexShrink: 0 }}>
              <FilterTabs tabs={tabs} active={filter} onChange={handleFilter} />
            </div>
          )}

          {/* ── LIST ──────────────────────────────────────────────────── */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {isLoading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LoadingSpinner size="lg" />
              </div>
            ) : !season ? (
              <Empty icon={Calendar} message="Aucune saison active" />
            ) : allMatches.length === 0 ? (
              <Empty icon={Calendar} message="Aucun match programmé" />
            ) : visible.length === 0 ? (
              <Empty icon={Radio} message="Pas de match dans cette catégorie" />
            ) : (
              <>
                <div className="ns grid gap-3 align-start flex-1 min-h-0 overflow-y-auto" style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))'
                }}>
                  {paginated.map((m, i) => <MatchCard key={m.id} match={m} index={i} />)}
                </div>

                {totalPages > 1 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    paddingTop: 8, flexShrink: 0
                  }}>

                    <button onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1} style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 9,
                        background: 'var(--bg-pill)', border: '1px solid var(--bd)',
                        color: 'var(--t2)', fontSize: '.62rem', fontWeight: 700,
                        cursor: safePage === 1 ? 'not-allowed' : 'pointer', opacity: safePage === 1 ? .3 : 1,
                        transition: 'all .18s', fontFamily: "'DM Sans',sans-serif"
                      }}>
                      <ChevronLeft size={12} /> Préc.
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button key={i} onClick={() => setPage(i + 1)} style={{
                          height: 7, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0,
                          background: safePage === i + 1 ? 'var(--accent)' : 'var(--bd)',
                          width: safePage === i + 1 ? 22 : 7,
                          transition: 'all .22s ease'
                        }} />
                      ))}
                    </div>

                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages} style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 9,
                        background: 'var(--bg-pill)', border: '1px solid var(--bd)',
                        color: 'var(--t2)', fontSize: '.62rem', fontWeight: 700,
                        cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
                        opacity: safePage === totalPages ? .3 : 1,
                        transition: 'all .18s', fontFamily: "'DM Sans',sans-serif"
                      }}>
                      Suiv. <ChevronRight size={12} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}