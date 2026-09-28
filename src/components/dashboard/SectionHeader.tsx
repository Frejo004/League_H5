import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

// ── Section header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
      <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{title}</span>
      <Link to={href} className="flex items-center gap-1 text-xs text-primary-400 hover:text-primary-300 transition-colors font-semibold">
        Tout voir <ArrowRight size={11} />
      </Link>
    </div>
  )
}
