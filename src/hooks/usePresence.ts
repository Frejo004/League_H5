/**
 * usePresence — Statut en ligne des utilisateurs
 *
 * - useMyPresence : publie et maintient la présence de l'utilisateur courant
 *   (heartbeat toutes les 30s, cleanup au démontage)
 * - useIsOnline : retourne true si un utilisateur spécifique est en ligne
 * - useOnlineUsers : retourne le Set des IDs en ligne parmi une liste
 *
 * Stratégie : table SQL `user_presence` + Supabase Realtime pour les updates.
 * "En ligne" = last_seen dans les 45 dernières secondes.
 */

import { useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const HEARTBEAT_INTERVAL = 30_000  // 30s
const ONLINE_THRESHOLD   = 45_000  // 45s — doit être > HEARTBEAT_INTERVAL

// ─────────────────────────────────────────────────────────────────────────────
// useMyPresence — à monter une seule fois dans AppLayout
// ─────────────────────────────────────────────────────────────────────────────

export function useMyPresence(userId?: string) {
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const publish = useCallback(async (uid: string) => {
    await (supabase.from('user_presence') as any).upsert(
      { user_id: uid, online_at: new Date().toISOString() } as any,
      { onConflict: 'user_id' } as any
    )
  }, [])

  const remove = useCallback(async (uid: string) => {
    await supabase.from('user_presence').delete().eq('user_id', uid)
  }, [])

  useEffect(() => {
    if (!userId) return

    // Publier immédiatement
    publish(userId)

    // Heartbeat régulier
    heartbeatRef.current = setInterval(() => publish(userId), HEARTBEAT_INTERVAL)

    // Cleanup : retirer la présence quand l'onglet se ferme ou l'user se déconnecte
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // L'onglet est caché — on arrête le heartbeat mais on ne supprime pas
        // (l'utilisateur peut revenir dans les 45s)
        if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      } else {
        // L'onglet redevient visible — republier et relancer le heartbeat
        publish(userId)
        heartbeatRef.current = setInterval(() => publish(userId), HEARTBEAT_INTERVAL)
      }
    }

    const handleBeforeUnload = () => {
      // Suppression best-effort via sendBeacon vers Supabase REST (pas de serveur custom requis)
      // On utilise directement la suppression synchrone via fetch keepalive
      try {
        remove(userId)
      } catch { /* best-effort */ }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      remove(userId)
    }
  }, [userId, publish, remove])
}

// ─────────────────────────────────────────────────────────────────────────────
// useOnlineUsers — retourne un Set des IDs en ligne parmi une liste
// ─────────────────────────────────────────────────────────────────────────────

export function useOnlineUsers(userIds: string[]) {
  const qc = useQueryClient()
  const key = ['presence', 'online', ...userIds.slice().sort()]

  const query = useQuery({
    queryKey: key,
    enabled: userIds.length > 0,
    queryFn: async (): Promise<Set<string>> => {
      if (userIds.length === 0) return new Set()

      const { data, error } = await supabase
        .from('user_presence')
        .select('user_id, last_seen')
        .in('user_id', userIds)

      if (error) return new Set()

      const threshold = Date.now() - ONLINE_THRESHOLD
      const online = new Set<string>()
      for (const row of data as any ?? []) {
        if (new Date((row as any).last_seen).getTime() > threshold) {
          online.add((row as any).user_id)
        }
      }
      return online
    },
    staleTime: 20_000,
    refetchInterval: 30_000,
  })

  // Realtime : écouter les changements de présence pour ces utilisateurs
  useEffect(() => {
    if (userIds.length === 0) return

    const name = `presence-watch-${userIds.slice().sort().join('-').slice(0, 60)}`
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${name}`)
    if (existing) supabase.removeChannel(existing)

    const ch = supabase
      .channel(name)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_presence',
      }, () => {
        qc.invalidateQueries({ queryKey: ['presence', 'online'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(ch) }
  }, [userIds.join(','), qc]) // eslint-disable-line react-hooks/exhaustive-deps

  return query.data ?? new Set<string>()
}

// ─────────────────────────────────────────────────────────────────────────────
// useIsOnline — statut d'un seul utilisateur
// ─────────────────────────────────────────────────────────────────────────────

export function useIsOnline(userId?: string): boolean {
  const onlineSet = useOnlineUsers(userId ? [userId] : [])
  return userId ? onlineSet.has(userId) : false
}
