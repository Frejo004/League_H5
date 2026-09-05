import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/**
 * Petit registre qui dédoublonne les abonnements Realtime par `name`.
 *
 * Sans ça, chaque composant qui appelle `useRealtimeInvalidate(...)`
 * crée son propre channel portant le même nom. Supabase Realtime
 * interdit d'enregistrer des callbacks `.on('postgres_changes', ...)`
 * après `.subscribe()` sur un channel déjà subscribed ailleurs, ce qui
 * lève :
 *   "cannot add `postgres_changes` callbacks for realtime:<name> after `subscribe()`."
 *
 * Le registre garde UN channel par nom et compte les références. Le
 * channel n'est retiré du client Realtime que lorsque la dernière
 * référence est relâchée.
 */
const registry = new Map<string, {
  channel: RealtimeChannel
  refCount: number
}>()

interface InvalidateOptions {
  /** Nom unique du channel Realtime */
  name: string
  /** Table à écouter (postgres_changes) */
  table: string
  /** Schéma (défaut: 'public') */
  schema?: string
  /** Query keys à invalider à chaque event */
  queryKeys: ReadonlyArray<ReadonlyArray<unknown>>
  /** Filtre additionnel Supabase */
  filter?: string
  /** Actif uniquement si truthy (seasonId, etc.) */
  enabled?: boolean
}

export function useRealtimeInvalidate({
  name,
  table,
  schema = 'public',
  queryKeys,
  filter,
  enabled = true,
}: InvalidateOptions): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    const existing = registry.get(name)
    if (existing) {
      existing.refCount += 1
      return () => {
        existing.refCount -= 1
        if (existing.refCount <= 0) {
          registry.delete(name)
          void supabase.removeChannel(existing.channel)
        }
      }
    }

    let channel = supabase.channel(name)
    const config: { event: '*'; schema: string; table: string; filter?: string } = {
      event: '*',
      schema,
      table,
    }
    if (filter) config.filter = filter
    channel = channel.on('postgres_changes', config, () => {
      for (const key of queryKeys) {
        queryClient.invalidateQueries({ queryKey: key as unknown[] })
      }
    })

    const created = channel.subscribe()
    registry.set(name, { channel: created, refCount: 1 })

    return () => {
      const entry = registry.get(name)
      if (!entry) return
      entry.refCount -= 1
      if (entry.refCount <= 0) {
        registry.delete(name)
        void supabase.removeChannel(entry.channel)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, table, schema, filter, enabled, queryClient])
}
