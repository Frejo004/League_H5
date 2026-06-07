import { useState } from 'react'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useAuth } from '@/hooks/useAuth'
import { 
  Newspaper, Plus, Trash2, Pin, 
  Image as ImageIcon, X, Send, 
  AlertCircle, 
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { clsx } from 'clsx'
import { useNews } from '@/hooks/useNews'

export function AdminNewsPage() {
  const { user } = useAuth()
  const { data: season } = useActiveSeason()
  const { data: news = [], isLoading, createPost, deletePost, togglePin } = useNews(season?.id)
  
  const [showAddForm, setShowAddForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [isPinned, setIsPinned] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !content || !season || !user) return

    await createPost.mutateAsync({
      title,
      content,
      image_url: imageUrl || null,
      is_pinned: isPinned,
      season_id: season.id,
      author_id: user.id
    })

    // Reset form
    setTitle('')
    setContent('')
    setImageUrl('')
    setIsPinned(false)
    setShowAddForm(false)
  }

  if (isLoading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
            <Newspaper className="text-primary-500" size={20} />
            Gestion des Actualités
          </h2>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-widest mt-1">
            Publier des annonces et résumés de journées
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={clsx(
            "btn-primary flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-widest transition-all",
            showAddForm ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20" : ""
          )}
        >
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          {showAddForm ? 'Annuler' : 'Nouvel Article'}
        </button>
      </div>

      {/* ── Formulaire d'ajout ── */}
      {showAddForm && (
        <form onSubmit={handleCreate} className="card border-primary-500/30 bg-primary-500/3 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <label className="label">Titre de l'annonce</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Mercato ouvert, Résumé J5..."
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">URL de l'image (optionnel)</label>
                <div className="relative">
                  <ImageIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="input pl-9"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-surface-border">
                <input
                  type="checkbox"
                  id="isPinned"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded border-surface-border text-primary-500 focus:ring-primary-500"
                />
                <label htmlFor="isPinned" className="text-xs font-bold text-text-primary uppercase cursor-pointer select-none">
                  Épingler cet article en haut
                </label>
              </div>
            </div>

            <div>
              <label className="label">Contenu de l'article</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Rédigez votre contenu ici..."
                className="input min-h-40 py-3 resize-none"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              disabled={createPost.isPending}
              className="btn-primary gap-2 px-8"
            >
              <Send size={16} />
              Publier maintenant
            </button>
          </div>
        </form>
      )}

      {/* ── Liste des articles ── */}
      <div className="grid grid-cols-1 gap-4">
        {news.length === 0 ? (
          <div className="card py-12 text-center opacity-50">
            <AlertCircle size={32} className="mx-auto mb-3 text-text-muted" />
            <p className="text-xs font-bold uppercase tracking-widest">Aucun article publié pour le moment</p>
          </div>
        ) : (
          news.map((post) => (
            <div key={post.id} className="card group flex items-center justify-between gap-4 hover:border-primary-500/30 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                {post.image_url ? (
                  <img src={post.image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-surface-raised shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-surface-raised flex items-center justify-center shrink-0">
                    <Newspaper size={18} className="text-text-muted" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-text-primary truncate uppercase">{post.title}</h4>
                    {post.is_pinned && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary-500 text-black text-[8px] font-black uppercase">
                        <Pin size={8} fill="currentColor" />
                        Épinglé
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-text-secondary mt-0.5 flex items-center gap-2">
                    {new Intl.DateTimeFormat('fr-FR').format(new Date(post.created_at))} 
                    <span className="w-1 h-1 rounded-full bg-surface-border" />
                    Par {post.author?.full_name || 'Admin'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePin.mutate({ id: post.id, is_pinned: !post.is_pinned })}
                  className={clsx(
                    "p-2 rounded-lg transition-all",
                    post.is_pinned ? "text-primary-400 bg-primary-500/10" : "text-text-muted hover:text-text-primary bg-surface-raised"
                  )}
                  title={post.is_pinned ? "Désépingler" : "Épingler"}
                >
                  <Pin size={14} />
                </button>
                <button
                  onClick={() => { if(confirm('Supprimer cet article ?')) deletePost.mutate(post.id) }}
                  className="p-2 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}