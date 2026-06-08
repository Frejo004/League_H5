import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'

interface ConfirmModalProps {
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
}

export function ConfirmModal({
  message,
  confirmLabel = 'Confirmer',
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmModalProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onCancel])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs mx-4 bg-chat-panel border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 flex flex-col items-center gap-3 text-center">
          <div
            className={clsx(
              'w-11 h-11 rounded-2xl flex items-center justify-center',
              danger ? 'bg-red-500/15' : 'bg-amber-500/15',
            )}
          >
            <AlertTriangle size={20} className={danger ? 'text-red-400' : 'text-amber-400'} />
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">{message}</p>
        </div>
        <div className="flex border-t border-white/[0.06]">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors border-r border-white/[0.06]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={clsx(
              'flex-1 py-3 text-sm font-semibold transition-colors',
              danger
                ? 'text-red-400 hover:text-red-300 hover:bg-red-500/10'
                : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
