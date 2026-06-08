/**
 * BetBasket — Panier flottant de paris
 * Visible sur la page Pronostics.
 * L'utilisateur ajoute des sélections depuis les marchés, choisit Simple/Combiné,
 * puis valide en une fois. Un bulletin combiné est perdu si une sélection est mauvaise.
 */
import { useState } from 'react'
import { ShoppingCart, X, Trash2, Check, ChevronDown, ChevronUp, Trophy, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { useBasket, useBetSlips } from '@/hooks/useBetSlips'
import { LoadingSpinner } from './LoadingSpinner'
import { ConfirmModal } from './ConfirmModal'
import type { BetSlipType } from '@/types/database'

export function BetBasket() {
  const { items, slipType, setSlipType, removeItem, clearBasket } = useBasket()
  const { submitSlip } = useBetSlips()

  const [open, setOpen]               = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const [error, setError]             = useState<string | null>(null)

  const count     = items.length
  const pointsMax = count * 3

  // Ne rien afficher si panier vide ET panel fermé
  if (count === 0 && !open) return null

  async function handleSubmit() {
    setError(null)
    try {
      await submitSlip.mutateAsync({ type: slipType, items })
      setSubmitted(true)
      clearBasket()
      setTimeout(() => { setSubmitted(false); setOpen(false) }, 2500)
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Erreur inconnue'
      if (msg.includes('duplicate_poll')) {
        setError('Un ou plusieurs pronostics sont déjà dans un bulletin en attente.')
      } else {
        setError(msg)
      }
    }
  }

  return (
    <>
      {/* ── Backdrop (mobile) ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Panneau panier ── */}
      {open && (
        <div className="fixed bottom-20 right-4 left-4 sm:left-auto sm:right-6 sm:w-80 z-50 flex flex-col rounded-2xl border border-white/[0.10] bg-[#0f1623] shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-hidden max-h-[calc(100vh-6rem)]">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/[0.04] border-b border-white/[0.07] shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <ShoppingCart size={15} className="text-primary-400 shrink-0" />
              <span className="text-sm font-black uppercase tracking-wide text-white">
                Mon bulletin
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary-500/25 text-primary-400 text-[10px] font-black shrink-0">
                {count} sélection{count > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {count > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmClear(true) }}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                  title="Vider le panier"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-500 hover:text-white transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* ── Succès ── */}
          {submitted && (
            <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-green-500/15 border border-green-500/20 flex items-center justify-center">
                <Check size={26} className="text-green-400" />
              </div>
              <p className="text-sm font-black text-green-400 uppercase tracking-wide">Bulletin soumis !</p>
              <p className="text-xs text-slate-500">Tes résultats seront calculés automatiquement à la fin du match.</p>
            </div>
          )}

          {/* ── Contenu ── */}
          {!submitted && (
            <>
              {count === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 px-4 text-center opacity-50">
                  <ShoppingCart size={28} className="text-slate-500" />
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Panier vide</p>
                  <p className="text-[10px] text-slate-600">Clique sur une option pour l'ajouter</p>
                </div>
              ) : (
                /* Liste des sélections — scrollable */
                <div className="overflow-y-auto flex-1 divide-y divide-white/[0.05]">
                  {items.map(item => (
                    <div key={item.poll_id} className="flex items-start gap-2 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        {item.match_label && (
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1 mb-1">
                            <Trophy size={8} className="shrink-0" />
                            <span className="truncate">{item.match_label}</span>
                          </p>
                        )}
                        <p className="text-[11px] text-slate-300 leading-snug line-clamp-2 mb-1.5">
                          {item.poll_question}
                        </p>
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-primary-500/15 text-primary-400 text-[11px] font-bold border border-primary-500/25">
                          {item.option_label}
                        </span>
                      </div>
                      <button
                        onClick={() => removeItem(item.poll_id)}
                        className="p-1 rounded-lg hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Footer : type + valider ── */}
              {count > 0 && (
                <div className="px-4 py-3 border-t border-white/[0.07] space-y-3 shrink-0 bg-white/[0.02]">

                  {/* Toggle Simple / Combiné */}
                  <div className="grid grid-cols-2 rounded-xl overflow-hidden border border-white/[0.08] p-0.5 gap-0.5 bg-white/[0.03]">
                    {(['simple', 'combo'] as BetSlipType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setSlipType(t)}
                        className={clsx(
                          'py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all',
                          slipType === t
                            ? 'bg-primary-500 text-white shadow-lg'
                            : 'text-slate-500 hover:text-slate-300 bg-transparent'
                        )}
                      >
                        {t === 'simple' ? 'Simple' : 'Combiné'}
                      </button>
                    ))}
                  </div>

                  {/* Explication */}
                  <div className={clsx(
                    'rounded-xl px-3 py-2.5 text-[10px] leading-relaxed border',
                    slipType === 'combo'
                      ? 'bg-orange-500/8 text-orange-300/80 border-orange-500/15'
                      : 'bg-primary-500/8 text-blue-300/80 border-primary-500/15'
                  )}>
                    {slipType === 'simple'
                      ? <>Chaque pronostic est indépendant. Tu gagnes <strong className="text-white">3 pts</strong> par bonne réponse.</>
                      : <>Toutes tes sélections doivent être correctes. Un seul raté = bulletin <strong className="text-white">perdu</strong>. Gain max : <strong className="text-white">{pointsMax} pts</strong>.</>
                    }
                  </div>

                  {/* Erreur */}
                  {error && (
                    <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px]">
                      <AlertCircle size={12} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Gain potentiel */}
                  <div className="flex items-center justify-between text-xs px-0.5">
                    <span className="text-slate-500 font-medium">Gain potentiel</span>
                    <span className="font-black text-primary-400 text-sm">{pointsMax} pts</span>
                  </div>

                  {/* Bouton valider */}
                  <button
                    onClick={handleSubmit}
                    disabled={submitSlip.isPending || count === 0}
                    className="w-full py-3 rounded-xl bg-primary-500 hover:bg-primary-400 active:scale-[0.98] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(99,102,241,0.3)]"
                  >
                    {submitSlip.isPending ? <LoadingSpinner size="sm" /> : <Check size={14} />}
                    Valider mon bulletin
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Bouton flottant ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'fixed bottom-5 right-4 sm:right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl font-bold text-sm uppercase tracking-wide transition-all',
          open
            ? 'bg-surface-raised border border-white/10 text-white'
            : count > 0
              ? 'bg-primary-500 text-white hover:bg-primary-400 shadow-[0_4px_20px_rgba(99,102,241,0.4)]'
              : 'bg-surface-raised border border-white/10 text-slate-400 hover:text-white'
        )}
      >
        <ShoppingCart size={17} />
        {count > 0 && (
          <span className={clsx(
            'text-xs font-black w-5 h-5 rounded-full flex items-center justify-center',
            open ? 'bg-primary-500 text-white' : 'bg-white text-primary-600'
          )}>
            {count}
          </span>
        )}
        <span className="hidden sm:inline">Mon bulletin</span>
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {/* ── Confirmation vider ── */}
      {confirmClear && (
        <ConfirmModal
          message="Vider le panier ? Toutes tes sélections non soumises seront perdues."
          confirmLabel="Vider"
          danger
          onConfirm={() => { clearBasket(); setConfirmClear(false) }}
          onCancel={() => setConfirmClear(false)}
        />
      )}
    </>
  )
}
