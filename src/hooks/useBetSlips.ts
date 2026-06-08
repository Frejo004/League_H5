import { createContext, useContext, useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { useActiveSeason } from './useSeasons'
import type {
  BetSlipType, BetSlipWithSelections, BasketItem,
} from '@/types/database'

// ─── Contexte panier ──────────────────────────────────────────────────────────

interface BasketState {
  items: BasketItem[]
  slipType: BetSlipType
  addItem: (item: BasketItem) => void
  removeItem: (pollId: string) => void
  updateItem: (pollId: string, optionIndex: number, optionLabel: string) => void
  clearBasket: () => void
  setSlipType: (t: BetSlipType) => void
  isInBasket: (pollId: string) => boolean
  getOptionForPoll: (pollId: string) => number | null
}

export const BasketContext = createContext<BasketState | null>(null)

export function useBasket() {
  const ctx = useContext(BasketContext)
  if (!ctx) throw new Error('useBasket must be inside BasketProvider')
  return ctx
}

/** Crée l'état du panier — à utiliser dans un provider */
export function createBasketState(): BasketState {
  // NOTE: On utilise un pattern fonctionnel pour que ce hook soit appelable
  // dans un composant React (voir BetBasketProvider)
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [items, setItems]     = useState<BasketItem[]>([])
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [slipType, setSlipType] = useState<BetSlipType>('simple')

  const addItem = useCallback((item: BasketItem) => {
    setItems(prev => {
      // Si le poll est déjà dans le panier, on remplace la sélection
      const exists = prev.findIndex(i => i.poll_id === item.poll_id)
      if (exists >= 0) {
        const next = [...prev]
        next[exists] = item
        return next
      }
      return [...prev, item]
    })
  }, [])

  const removeItem = useCallback((pollId: string) => {
    setItems(prev => prev.filter(i => i.poll_id !== pollId))
  }, [])

  const updateItem = useCallback((pollId: string, optionIndex: number, optionLabel: string) => {
    setItems(prev => prev.map(i =>
      i.poll_id === pollId ? { ...i, option_index: optionIndex, option_label: optionLabel } : i
    ))
  }, [])

  const clearBasket = useCallback(() => setItems([]), [])

  const isInBasket = useCallback((pollId: string) =>
    items.some(i => i.poll_id === pollId), [items])

  const getOptionForPoll = useCallback((pollId: string) =>
    items.find(i => i.poll_id === pollId)?.option_index ?? null, [items])

  return { items, slipType, addItem, removeItem, updateItem, clearBasket, setSlipType, isInBasket, getOptionForPoll }
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useBetSlips() {
  const { user } = useAuth()
  const { data: season } = useActiveSeason()
  const queryClient = useQueryClient()

  // Historique des bulletins de l'utilisateur
  const historyQuery = useQuery({
    queryKey: ['bet-slips-history', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<BetSlipWithSelections[]> => {
      const { data, error } = await supabase
        .from('bet_slips_history')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []) as BetSlipWithSelections[]
    },
  })

  // Soumettre un bulletin via RPC (transaction atomique)
  const submitSlip = useMutation({
    mutationFn: async ({
      type,
      items,
    }: {
      type: BetSlipType
      items: BasketItem[]
    }) => {
      if (!user || !season) throw new Error('Not authenticated')
      if (items.length === 0) throw new Error('Panier vide')

      const selections = items.map(i => ({
        poll_id: i.poll_id,
        option_index: i.option_index,
      }))

      const { data, error } = await supabase.rpc('submit_bet_slip', {
        p_user_id: user.id,
        p_season_id: season.id,
        p_type: type,
        p_selections: selections,
      })

      if (error) throw error
      return data as string // slip_id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bet-slips-history', user?.id] })
    },
  })

  return { history: historyQuery, submitSlip }
}
