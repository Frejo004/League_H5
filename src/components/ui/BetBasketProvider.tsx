/**
 * BetBasketProvider
 * Fournit le contexte panier à toute l'app.
 * À envelopper autour de <App /> ou du layout principal.
 */
import { BasketContext, useBasketState } from '@/hooks/useBetSlips'

export function BetBasketProvider({ children }: { children: React.ReactNode }) {
  const state = useBasketState()
  return (
    <BasketContext.Provider value={state}>
      {children}
    </BasketContext.Provider>
  )
}
