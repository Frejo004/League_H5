import { useMemo, useState, useCallback, useEffect } from 'react'
import { useMatches } from '@/hooks/useMatches'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type NotifType =
  | 'match_upcoming'
  | 'match_completed'
  | 'mvp_vote_open'
  | 'invite_pending'
  | 'invite_expiring'
  | 'spectator_request'  // nouvelle demande d'accès spectateur (admin)

export interface Notification {
  id: string
  type: NotifType
  title: string
  message: string
  href: string
  createdAt: Date
  urgent?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistance des IDs lus dans localStorage
// ─────────────────────────────────────────────────────────────────────────────

const LS_KEY = 'lh5_read_notifs'

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]))
  } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sous-hooks
// ─────────────────────────────────────────────────────────────────────────────

function useActiveInvites(enabled: boolean) {
  return useQuery({
    queryKey: ['notifications_invites'],
    enabled,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_invites')
        .select(`
          id, created_at, expires_at, used_at,
          players(id, first_name, last_name,
            teams!players_team_id_fkey(name))
        `)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
      if (error) throw error
      return data ?? []
    },
  })
}

// Demandes spectateurs en attente (admin uniquement)
function usePendingSpectators(enabled: boolean) {
  return useQuery({
    queryKey: ['notifications_spectators'],
    enabled,
    staleTime: 1000 * 30,
    refetchInterval: 15000, // poll toutes les 15s
    queryFn: async () => {
      const { data, error } = await supabase
        .from('spectators')
        .select('id, requested_at, user_id, profiles(full_name, email)')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

function useMyVotedMatches(userId?: string, matchIds?: string[]) {
  return useQuery({
    queryKey: ['notifications_my_votes', userId, matchIds],
    enabled: !!userId && !!matchIds?.length,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mvp_votes')
        .select('match_id')
        .eq('voted_by', userId!)
        .in('match_id', matchIds!)
      if (error) throw error
      return new Set((data ?? []).map(v => v.match_id))
    },
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal
// ─────────────────────────────────────────────────────────────────────────────

export function useNotifications() {
  const { user, isAdmin, isCaptain } = useAuth()
  const { data: season } = useActiveSeason()
  const { data: matches } = useMatches(season?.id)

  const isPrivileged = isAdmin || isCaptain
  const { data: invites } = useActiveInvites(isPrivileged)
  const { data: pendingSpectators } = usePendingSpectators(isAdmin)

  // IDs lus — initialisés depuis localStorage
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds)

  // Sync readIds → localStorage à chaque changement
  useEffect(() => { saveReadIds(readIds) }, [readIds])

  // Matchs terminés récents (< 72h) pour le vote MVP
  const recentCompletedIds = useMemo(() => {
    const cutoff = Date.now() - 72 * 60 * 60 * 1000
    return (matches ?? [])
      .filter(m => m.status === 'completed' && m.played_at && new Date(m.played_at).getTime() > cutoff)
      .map(m => m.id)
  }, [matches])

  const { data: votedMatchIds } = useMyVotedMatches(user?.id, recentCompletedIds)

  // Toutes les notifications (non filtrées)
  const allNotifications = useMemo<Notification[]>(() => {    const notifs: Notification[] = []
    const now = Date.now()

    // ── 1. Matchs à venir (< 24h) ──────────────────────────────────────────
    for (const m of matches ?? []) {
      if (m.status !== 'scheduled' || !m.scheduled_at) continue
      const diff = new Date(m.scheduled_at).getTime() - now
      if (diff <= 0 || diff >= 24 * 60 * 60 * 1000) continue
      const hours = Math.floor(diff / (60 * 60 * 1000))
      const mins  = Math.floor((diff % (60 * 60 * 1000)) / 60000)
      const home  = (m.home_team as { name: string })?.name ?? '?'
      const away  = (m.away_team as { name: string })?.name ?? '?'
      notifs.push({
        id:        `upcoming-${m.id}`,
        type:      'match_upcoming',
        title:     'Match à venir',
        message:   `${home} vs ${away} — dans ${hours > 0 ? `${hours}h` : `${mins}min`}`,
        href:      `/matches/${m.id}`,
        createdAt: new Date(m.scheduled_at),
        urgent:    diff < 60 * 60 * 1000,
      })
    }

    // ── 2. Matchs terminés récemment (< 48h) ───────────────────────────────
    for (const m of matches ?? []) {
      if (m.status !== 'completed' || !m.played_at) continue
      if (now - new Date(m.played_at).getTime() >= 48 * 60 * 60 * 1000) continue
      const home = (m.home_team as { name: string })?.name ?? '?'
      const away = (m.away_team as { name: string })?.name ?? '?'
      notifs.push({
        id:        `completed-${m.id}`,
        type:      'match_completed',
        title:     'Résultat disponible',
        message:   `${home} ${m.home_score ?? 0} – ${m.away_score ?? 0} ${away}`,
        href:      `/matches/${m.id}`,
        createdAt: new Date(m.played_at),
      })
    }

    // ── 3. Vote MVP disponible (match terminé, user n'a pas voté) ──────────
    if (user) {
      for (const m of matches ?? []) {
        if (m.status !== 'completed' || !m.played_at) continue
        if (now - new Date(m.played_at).getTime() >= 72 * 60 * 60 * 1000) continue
        if (votedMatchIds?.has(m.id)) continue
        const home = (m.home_team as { name: string })?.name ?? '?'
        const away = (m.away_team as { name: string })?.name ?? '?'
        notifs.push({
          id:        `mvp-${m.id}`,
          type:      'mvp_vote_open',
          title:     'Vote MVP ouvert',
          message:   `Élisez l'homme du match : ${home} vs ${away}`,
          href:      `/matches/${m.id}`,
          createdAt: new Date(m.played_at),
        })
      }
    }

    // ── 4. Invitations en attente (admin/captain) ───────────────────────────
    if (isPrivileged && invites) {
      for (const inv of invites) {
        const p = inv.players as unknown as {
          first_name: string; last_name: string
          teams: { name: string } | null
        } | null
        if (!p) continue
        const msLeft     = new Date(inv.expires_at).getTime() - now
        const isExpiring = msLeft < 30 * 60 * 1000
        notifs.push({
          id:        `invite-${inv.id}`,
          type:      isExpiring ? 'invite_expiring' : 'invite_pending',
          title:     isExpiring ? 'Invitation expire bientôt' : 'Invitation en attente',
          message:   `${p.first_name} ${p.last_name} (${p.teams?.name ?? '?'}) n'a pas encore rejoint`,
          href:      '/admin',
          createdAt: new Date(inv.created_at),
          urgent:    isExpiring,
        })
      }
    }

    // ── 5. Demandes d'accès spectateurs (admin uniquement) ─────────────────
    if (isAdmin && pendingSpectators) {
      for (const s of pendingSpectators) {
        const p = s.profiles as unknown as { full_name: string | null; email: string } | null
        const name = p?.full_name ?? p?.email ?? 'Utilisateur inconnu'
        notifs.push({
          id:        `spectator-${s.id}`,
          type:      'spectator_request',
          title:     'Demande d\'accès',
          message:   `${name} souhaite accéder à la ligue`,
          href:      '/admin',
          createdAt: new Date(s.requested_at),
          urgent:    true,
        })
      }
    }

    return notifs.sort((a, b) => {
      if (a.urgent && !b.urgent) return -1
      if (!a.urgent && b.urgent) return 1
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
  }, [matches, invites, pendingSpectators, votedMatchIds, user, isAdmin, isPrivileged])

  // Notifications non lues
  const notifications = useMemo(
    () => allNotifications.filter(n => !readIds.has(n.id)),
    [allNotifications, readIds]
  )

  // Marquer toutes comme lues
  const markAllRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev)
      allNotifications.forEach(n => next.add(n.id))
      return next
    })
  }, [allNotifications])

  // Marquer une seule comme lue
  const markRead = useCallback((id: string) => {
    setReadIds(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  return {
    notifications,
    count:     notifications.length,
    hasUrgent: notifications.some(n => n.urgent),
    markAllRead,
    markRead,
  }
}
