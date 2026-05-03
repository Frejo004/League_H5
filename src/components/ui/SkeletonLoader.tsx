import { clsx } from 'clsx'

// ── Primitives ────────────────────────────────────────────────────────────────

export function SkeletonLine({ width = 'w-full', height = 'h-3', className }: {
  width?: string; height?: string; className?: string
}) {
  return <div className={clsx('skeleton-text', width, height, className)} />
}

export function SkeletonCircle({ size = 'w-8 h-8', className }: {
  size?: string; className?: string
}) {
  return <div className={clsx('skeleton-circle', size, className)} />
}

export function SkeletonRect({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} />
}

// ── Skeleton card générique ───────────────────────────────────────────────────

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-card space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonCircle size="w-9 h-9" />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="w-2/3" />
          <SkeletonLine width="w-1/3" height="h-2" />
        </div>
      </div>
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonLine key={i} width={i % 2 === 0 ? 'w-full' : 'w-3/4'} />
      ))}
    </div>
  )
}

// ── Skeleton pour une ligne de tableau ───────────────────────────────────────

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  const widths = ['w-8', 'w-1/3', 'w-1/4', 'w-1/5', 'w-1/6', 'w-12']
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border/50 last:border-b-0">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonLine
          key={i}
          width={widths[i] ?? 'w-16'}
          height="h-3"
        />
      ))}
    </div>
  )
}

// ── Skeleton pour la liste des matchs ────────────────────────────────────────

export function SkeletonMatchCard() {
  return (
    <div className="flex items-center px-4 py-4 gap-3 border-b border-surface-border/40 last:border-b-0">
      {/* Home */}
      <div className="flex flex-col items-center gap-2 flex-1">
        <SkeletonRect className="w-12 h-12 rounded-xl" />
        <SkeletonLine width="w-16" height="h-2" />
      </div>
      {/* Center */}
      <div className="flex flex-col items-center gap-1 shrink-0 min-w-[90px]">
        <SkeletonLine width="w-16" height="h-6" />
        <SkeletonLine width="w-12" height="h-2" />
      </div>
      {/* Away */}
      <div className="flex flex-col items-center gap-2 flex-1">
        <SkeletonRect className="w-12 h-12 rounded-xl" />
        <SkeletonLine width="w-16" height="h-2" />
      </div>
    </div>
  )
}

// ── Skeleton pour le classement ──────────────────────────────────────────────

export function SkeletonStandingsTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-surface-border">
        {['w-6', 'w-1/3', 'w-8', 'w-8', 'w-8', 'w-8', 'w-16', 'w-10'].map((w, i) => (
          <SkeletonLine key={i} width={w} height="h-2" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} cols={6} />
      ))}
    </div>
  )
}

// ── Skeleton pour les stats KPI ──────────────────────────────────────────────

export function SkeletonKpiGrid({ count = 4 }: { count?: number }) {
  return (
    <div className={clsx(
      'grid gap-2',
      count === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'
    )}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="stat-card space-y-3">
          <SkeletonCircle size="w-6 h-6" />
          <SkeletonLine width="w-1/2" height="h-6" />
          <SkeletonLine width="w-2/3" height="h-2" />
        </div>
      ))}
    </div>
  )
}

// ── Skeleton pour le profil joueur ───────────────────────────────────────────

export function SkeletonPlayerProfile() {
  return (
    <div className="space-y-3">
      {/* Hero */}
      <div className="card flex items-center gap-4">
        <SkeletonCircle size="w-16 h-16" />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="w-1/2" height="h-5" />
          <SkeletonLine width="w-1/3" height="h-3" />
          <SkeletonLine width="w-1/4" height="h-3" />
        </div>
      </div>
      {/* Stats */}
      <SkeletonKpiGrid count={4} />
      {/* Matches */}
      <div className="card p-0 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRow key={i} cols={5} />
        ))}
      </div>
    </div>
  )
}
