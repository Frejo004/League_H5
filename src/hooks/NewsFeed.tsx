import { useActiveSeason } from '@/hooks/useSeasons'
import { useNews } from '@/hooks/useNews'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Calendar, Pin, User, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

const formatDate = (date: string | Date) =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))

export function NewsFeed() {
  const { data: season } = useActiveSeason()
  const { data: news, isLoading } = useNews(season?.id)

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>
  if (!news || news.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-4xl bg-surface-card border border-surface-border flex items-center justify-center">
          <Calendar size={36} className="text-slate-600" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#C8F135]/10 border-2 border-surface flex items-center justify-center">
          <span className="text-xl">📰</span>
        </div>
      </div>
      <h3 className="text-xl font-black text-text-primary mb-2 font-['Barlow_Condensed'] uppercase tracking-tight">
        Aucune actualité pour le moment
      </h3>
      <p className="text-sm text-slate-500 max-w-md text-center leading-relaxed">
        Les dernières nouvelles de la ligue apparaîtront ici. Restez connecté pour ne rien manquer !
      </p>
    </div>
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {news.map((post) => (
        <article 
          key={post.id} 
          className={clsx(
            "group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl",
            post.is_pinned 
              ? "border-primary-500/50 bg-primary-500/5 shadow-lg shadow-primary-500/10" 
              : "border-surface-border bg-surface shadow-sm hover:border-primary-500/30"
          )}
        >
          {/* Badge épinglé */}
          {post.is_pinned && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-500 text-black text-[10px] font-black uppercase tracking-tighter">
              <Pin size={12} fill="currentColor" />
              Épinglé
            </div>
          )}

          {/* Image de couverture */}
          <div className="relative aspect-video overflow-hidden bg-surface-raised">
            {post.image_url ? (
              <img 
                src={post.image_url} 
                alt={post.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary-500/10 to-surface-raised">
                <span className="text-4xl font-black text-primary-500/20 italic">LH5</span>
              </div>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Contenu */}
          <div className="flex flex-1 flex-col p-5">
            <div className="mb-3 flex items-center gap-3 text-[10px] font-bold text-text-secondary uppercase tracking-widest">
              <span className="flex items-center gap-1">
                <Calendar size={12} className="text-primary-400" />
                {formatDate(new Date(post.created_at))}
              </span>
              <span className="h-1 w-1 rounded-full bg-surface-border" />
              <span className="flex items-center gap-1">
                <User size={12} className="text-primary-400" />
                {post.author?.full_name || 'Admin'}
              </span>   
            </div>

            <h3 className="mb-2 text-lg font-black text-text-primary leading-tight group-hover:text-primary-400 transition-colors">
              {post.title}
            </h3>
            
            <p className="line-clamp-3 text-sm text-text-secondary leading-relaxed mb-6">
              {post.content}
            </p>

            <div className="mt-auto pt-4 border-t border-surface-border">
              <button className="flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.2em] text-primary-400 hover:text-primary-300 transition-colors">
                Lire la suite
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
