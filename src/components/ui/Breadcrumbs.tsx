import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  to?: string
}

export function Breadcrumbs({ items, className, homeTo = '/' }: { items: BreadcrumbItem[], className?: string, homeTo?: string }) {
  return (
    <nav className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest overflow-x-auto whitespace-nowrap scrollbar-hide ${className ?? ''}`}
         style={{ color: 'var(--color-text-muted)' }}
         aria-label="Fil d'Ariane">
      <Link
        to={homeTo}
        className="hover:text-primary-400 transition-colors flex items-center gap-1 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-500 rounded"
        title="Accueil"
      >
        <Home size={11} />
      </Link>

      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5 shrink-0">
          <ChevronRight size={10} style={{ color: 'var(--color-surface-muted)' }} />
          {item.to ? (
            <Link
              to={item.to}
              className="transition-colors hover:text-primary-400 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary-500 rounded"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {item.label}
            </Link>
          ) : (
            <span className="truncate max-w-[150px]" style={{ color: 'var(--color-text-secondary)' }}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
