/**
 * LiveReactionBar — Barre de réactions spectateurs avec emojis flottants
 */
import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { useLiveReactions } from '@/hooks/useMatchLive'
import { useAuth } from '@/hooks/useAuth'

const EMOJIS = ['⚽', '🔥', '😱', '👏', '❤️', '😤', '🎉']

interface FloatingEmoji {
  id: string
  emoji: string
  x: number
}

interface LiveReactionBarProps {
  matchId: string
  className?: string
}

export function LiveReactionBar({ matchId, className }: LiveReactionBarProps) {
  const { user } = useAuth()
  const { counts, burst, sendReaction } = useLiveReactions(matchId)
  const [floating, setFloating] = useState<FloatingEmoji[]>([])
  const [cooldown, setCooldown] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (burst.length === 0) return
    const last = burst[burst.length - 1]
    const fe: FloatingEmoji = { id: last.id, emoji: last.emoji, x: 10 + Math.random() * 80 }
    setFloating(prev => [...prev.slice(-15), fe])
    setTimeout(() => setFloating(prev => prev.filter(f => f.id !== fe.id)), 2800)
  }, [burst])

  const handleReact = (emoji: string) => {
    if (!user || cooldown[emoji]) return
    sendReaction.mutate({ emoji, userId: user.id })
    setCooldown(prev => ({ ...prev, [emoji]: true }))
    setTimeout(() => setCooldown(prev => ({ ...prev, [emoji]: false })), 1000)
  }

  return (
    <div className={clsx('relative', className)}>
      {/* Emojis flottants */}
      <div className="absolute bottom-full left-0 right-0 h-24 pointer-events-none overflow-hidden">
        {floating.map(fe => (
          <div
            key={fe.id}
            className="absolute text-2xl"
            style={{ left: `${fe.x}%`, bottom: 0, animation: 'floatUp 2.8s ease-out forwards' }}
          >
            {fe.emoji}
          </div>
        ))}
      </div>

      {/* Boutons */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {EMOJIS.map(emoji => {
          const count = counts[emoji] ?? 0
          const isCool = cooldown[emoji]
          return (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              disabled={isCool || !user}
              className={clsx(
                'flex items-center gap-1 px-2.5 py-1.5 rounded-full text-sm transition-all',
                'border border-border hover:border-border/80 hover:bg-muted/10',
                isCool ? 'scale-110 bg-primary/10 border-primary/20' : 'bg-muted/5',
                !user && 'opacity-50 cursor-not-allowed',
              )}
            >
              <span>{emoji}</span>
              {count > 0 && (
                <span className="text-[10px] font-bold text-muted-foreground tabular-nums">{count}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
