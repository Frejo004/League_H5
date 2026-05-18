import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  to?: string
}

export function Breadcrumbs({ items, className, homeTo = '/' }: { items: BreadcrumbItem[], className?: string, homeTo?: string }) {
  return (
    <nav className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-widest overflow-x-auto whitespace-nowrap scrollbar-hide ${className ?? ''}`}>
      <Link 
        to={homeTo}
        className="hover:text-primary-400 transition-colors flex items-center gap-1 shrink-0"
        title="Accueil"
      >
        <Home size={11} />
      </Link>
      
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5 shrink-0">
          <ChevronRight size={10} className="text-slate-700" />
          {item.to ? (
            <Link 
              to={item.to} 
              className="hover:text-slate-200 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-300 truncate max-w-[150px]">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
