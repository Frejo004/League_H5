import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, User, Users, X } from 'lucide-react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { usePlayers } from '@/hooks/usePlayers'
import { useTeams } from '@/hooks/useTeams'
import { clsx } from 'clsx'

interface Result {
  id: string
  label: string
  sub: string
  color: string
  avatar?: string | null
  href: string
  type: 'player' | 'team'
}

export function GlobalSearch() {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const { data: season } = useActiveSeason()
  const { data: players } = usePlayers(season?.id)
  const { data: teams }   = useTeams(season?.id)

  // Cmd+K / Ctrl+K pour ouvrir
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Focus input à l'ouverture
  useEffect(() => {
    if (open) {
      setQuery('')
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const results: Result[] = query.trim().length < 1 ? [] : [
    ...(players ?? [])
      .filter(p => `${p.first_name} ${p.last_name}`.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5)
      .map(p => ({
        id: p.id,
        label: `${p.first_name} ${p.last_name}`,
        sub: (p as any).teams?.name ?? '',
        color: (p as any).teams?.color ?? '#334155',
        avatar: p.avatar_url,
        href: `/players/${p.id}`,
        type: 'player' as const,
      })),
    ...(teams ?? [])
      .filter(t => t.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .map(t => ({
        id: t.id,
        label: t.name,
        sub: 'Équipe',
        color: t.color,
        avatar: t.logo_url,
        href: `/teams/${t.id}`,
        type: 'team' as const,
      })),
  ]

  const go = useCallback((href: string) => {
    setOpen(false)
    navigate(href)
  }, [navigate])

  // Navigation clavier
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && results[cursor]) go(results[cursor].href)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
        style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.45)',
        }}
        aria-label="Recherche globale"
      >
        <Search size={14} />
        <span className="hidden sm:block text-xs">Rechercher…</span>
        <kbd
          className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}
        >
          ⌘K
        </kbd>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-scale-in"
        style={{ backgroundColor: '#161c2d', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0) }}
            onKeyDown={onKey}
            placeholder="Joueur, équipe…"
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-600"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-500 hover:text-slate-300 transition-colors">
              <X size={14} />
            </button>
          )}
          <kbd
            className="px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        {query.trim().length > 0 && (
          <div className="max-h-80 overflow-y-auto py-1.5">
            {results.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-600">
                <Search size={22} />
                <p className="text-sm">Aucun résultat pour « {query} »</p>
              </div>
            ) : (
              results.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => go(r.href)}
                  onMouseEnter={() => setCursor(i)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    cursor === i ? 'bg-white/6' : 'hover:bg-white/4'
                  )}
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden"
                    style={{ backgroundColor: r.color }}
                  >
                    {r.avatar
                      ? <img src={r.avatar} alt="" className="w-full h-full object-cover" />
                      : r.type === 'team'
                        ? <Users size={14} />
                        : <User size={14} />
                    }
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{r.label}</p>
                    {r.sub && <p className="text-xs text-slate-500 truncate">{r.sub}</p>}
                  </div>

                  {/* Type badge */}
                  <span className="text-[10px] font-bold uppercase tracking-wider shrink-0 px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: r.type === 'team' ? 'rgba(139,92,246,0.15)' : 'rgba(6,182,212,0.15)',
                      color: r.type === 'team' ? '#a78bfa' : '#22d3ee',
                    }}
                  >
                    {r.type === 'team' ? 'Équipe' : 'Joueur'}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {/* Footer hint */}
        {query.trim().length === 0 && (
          <div className="flex items-center justify-center gap-4 px-4 py-4 text-xs text-slate-700">
            <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-white/6 text-slate-500">↑↓</kbd> naviguer</span>
            <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-white/6 text-slate-500">↵</kbd> ouvrir</span>
            <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-white/6 text-slate-500">ESC</kbd> fermer</span>
          </div>
        )}
      </div>
    </div>
  )
}
