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

  const [open, setOpen]             = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const count = items.length
  if (count === 0 && !open) return null   // Rien à montrer si panier vide et fermé

  const pointsMax = slipType === 'combo'
    ? count * 3   // combiné : tout ou rien, max = N * 3
    : count * 3   // simple  : max = N * 3 (chaque sélection indépendante)

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
      {/* ── Bouton flottant ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl font-bold text-sm uppercase tracking-wide transition-all',
          count > 0
            ? 'bg-primary-500 text-white hover:bg-primary-400'
            : 'bg-surface-raised border border-white/10 text-text-muted hover:text-text-primary'
        )}
      >
        <ShoppingCart size={18} />
        {count > 0 && (
          <span className="bg-white text-primary-600 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center">
            {count}
          </span>
        )}
        <span className="hidden sm:inline">Mon bulletin</span>
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {/* ── Panneau panier ── */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 max-h-[70vh] flex flex-col rounded-2xl border border-white/[0.08] bg-surface-panel shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-surface-raised/80 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-primary-400" />
              <span className="text-sm font-black uppercase tracking-wide text-text-primary">
                Mon bulletin
              </span>
              <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-[10px] font-black">
                {count} sélection{count > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {count > 0 && (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
                  title="Vider le panier"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.06] text-text-muted transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Succès */}
          {submitted && (
            <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-green-500/15 flex items-center justify-center">
                <Check size={24} className="text-green-400" />
              </div>
              <p className="text-sm font-bold text-green-400">Bulletin soumis !</p>
              <p className="text-xs text-text-muted">Tes résultats seront calculés automatiquement.</p>
            </div>
          )}

          {/* Liste des sélections */}
          {!submitted && (
            <>
              {count === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 px-4 text-center opacity-50">
                  <ShoppingCart size={28} className="text-text-muted" />
                  <p className="text-xs font-bold uppercase tracking-widest">Panier vide</p>
                  <p className="text-[10px] text-text-muted">Clique sur une option pour l'ajouter</p>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 divide-y divide-white/[0.04]">
                  {items.map(item => (
                    <div key={item.poll_id} className="flex items-start gap-2 px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        {item.match_label && (
                          <p className="text-[9px] text-text-muted font-bold uppercase tracking-wide flex items-center gap-1 mb-0.5">
                            <Trophy size={8} /> {item.match_label}
                          </p>
                        )}
                        <p className="text-[11px] text-text-secondary leading-snug truncate">{item.poll_question}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded bg-primary-500/15 text-primary-400 text-[11px] font-bold border border-primary-500/20">
                          {item.option_label}
                        </span>
                      </div>
                      <button
                        onClick={() => removeItem(item.poll_id)}
                        className="p-1 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors shrink-0 mt-0.5"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Type de bulletin */}
              {count > 0 && (
                <div className="px-3 py-2.5 border-t border-white/[0.06] space-y-3">
                  {/* Toggle Simple / Combiné */}
                  <div className="flex rounded-xl overflow-hidden border border-white/[0.08]">
                    {(['simple', 'combo'] as BetSlipType[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setSlipType(t)}
                        className={clsx(
                          'flex-1 py-2 text-xs font-bold uppercase tracking-wide transition-all',
                          slipType === t
                            ? 'bg-primary-500 text-white'
                            : 'text-text-muted hover:text-text-primary bg-transparent'
                        )}
                      >
                        {t === 'simple' ? 'Simple' : 'Combiné'}
                      </button>
                    ))}
                  </div>

                  {/* Explication */}
                  <div className={clsx(
                    'rounded-xl px-3 py-2 text-[10px] leading-relaxed',
                    slipType === 'combo'
                      ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20'
                      : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                  )}>
                    {slipType === 'simple' ? (
                      <>Chaque pronostic est indépendant. Tu gagnes <strong>3 pts</strong> par bonne réponse.</>
                    ) : (
                      <>Toutes tes sélections doivent être correctes. Un seul raté = bulletin <strong>perdu</strong>. Gain max : <strong>{pointsMax} pts</strong>.</>
                    )}
                  </div>

                  {/* Erreur */}
                  {error && (
                    <div className="flex items-start gap-2 rounded-xl px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px]">
                      <AlertCircle size={12} className="shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}

                  {/* Résumé points */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Gain potentiel</span>
                    <span className="font-black text-primary-400">{pointsMax} pts</span>
                  </div>

                  {/* Bouton valider */}
                  <button
                    onClick={handleSubmit}
                    disabled={submitSlip.isPending || count === 0}
                    className="w-full py-2.5 rounded-xl bg-primary-500 hover:bg-primary-400 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                  >
                    {submitSlip.isPending ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Check size={14} />
                    )}
                    Valider mon bulletin
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Confirmation vider */}
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
