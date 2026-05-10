/**
 * KeyboardShortcutsHelp — Modal d'aide des raccourcis clavier
 * Affiché avec la touche ?
 */
import { X } from 'lucide-react'
import { SHORTCUT_HELP } from '@/hooks/useKeyboardShortcuts'

interface Props {
  onClose: () => void
}

export function KeyboardShortcutsHelp({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-2xl overflow-hidden shadow-2xl"
        style={{
          backgroundColor: '#161B22',
          border: '1px solid rgba(255,255,255,0.1)',
          animation: 'scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h2 className="text-sm font-bold text-white">Raccourcis clavier</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Desktop uniquement</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/8 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Liste */}
        <div className="p-4 space-y-2">
          {SHORTCUT_HELP.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-400">{description}</span>
              <div className="flex items-center gap-1 shrink-0">
                {keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <kbd
                      className="px-2 py-0.5 rounded text-[11px] font-mono font-bold text-slate-300"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        boxShadow: '0 1px 0 rgba(255,255,255,0.06)',
                      }}
                    >
                      {k}
                    </kbd>
                    {i < keys.length - 1 && (
                      <span className="text-slate-700 text-[10px]">puis</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/[0.06] text-center">
          <p className="text-[10px] text-slate-700">
            Appuyez sur <kbd className="px-1 rounded bg-white/8 text-slate-500 font-mono">?</kbd> pour afficher/masquer
          </p>
        </div>
      </div>
    </div>
  )
}
