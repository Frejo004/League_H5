import { useMemo, useState, useCallback, useEffect } from 'react'
import { useMatches } from '@/hooks/useMatches'
import { useActiveSeason } from '@/hooks/useSeasons'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { pushLocal } from '@/hooks/useRealtime'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type NotifType =
  | 'match_upcoming'
  | 'match_completed'
  | 'mvp_vote_open'
  | 'invite_pending'
  | 'invite_expiring'
  | 'spectator_request'
  | 'tactique_selected'

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
        .select('id, requested_at, user_id, profiles!spectators_user_id_fkey(full_name, email)')
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

function useMyNextLineup(userId?: string, matchId?: string) {
  return useQuery({
    queryKey: ['notifications_my_lineup', userId, matchId],
    enabled: !!userId && !!matchId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      // Trouve le player_id de l'user
      const { data: p } = await supabase.from('players').select('id').eq('user_id', userId!).maybeSingle()
      if (!p) return null

      const { data, error } = await supabase
        .from('match_lineups')
        .select('is_starter, team_id, matches(home_team_id, away_team:teams!away_team_id(name), home_team:teams!home_team_id(name))')
        .eq('match_id', matchId!)
        .eq('player_id', p.id)
        .maybeSingle()
      if (error) throw error
      return data
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

  const nextMatch = useMemo(() => {
    return (matches ?? [])
      .filter(m => m.status === 'scheduled' && m.scheduled_at)
      .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0]
  }, [matches])

  const { data: myLineup } = useMyNextLineup(user?.id, nextMatch?.id)

  // IDs lus — initialisés depuis localStorage
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds)

  // Sync readIds → localStorage à chaque changement
  useEffect(() => { saveReadIds(readIds) }, [readIds])

  // Realtime : Invalider les requêtes quand un nouveau spectateur demande l'accès
  const qc = useQueryClient()
  useEffect(() => {
    if (!isAdmin) return

    const channel = supabase
      .channel('admin-notifications-spectators')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spectators' }, async (payload) => {
        qc.invalidateQueries({ queryKey: ['notifications_spectators'] })
        qc.invalidateQueries({ queryKey: ['spectators'] })

        // Si c'est une nouvelle demande, on envoie une notification push locale
        if (payload.eventType === 'INSERT') {
          const newReq = payload.new as any
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', newReq.user_id)
            .single()
          
          const name = profile?.full_name ?? profile?.email ?? 'Un nouvel utilisateur'
          pushLocal(
            'Demande d\'accès',
            `${name} souhaite rejoindre la ligue`,
            `spectator-${newReq.id}`,
            '/admin?tab=spectators'
          )
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [isAdmin, qc])

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
          href:      '/admin?tab=spectators',
          createdAt: new Date(s.requested_at),
          urgent:    true,
        })
      }
    }

    // ── 6. Sélection tactique (User est titulaire pour le prochain match) ───
    if (myLineup?.is_starter && nextMatch) {
      const isHome = myLineup.team_id === (nextMatch as any).home_team_id
      const opp = isHome ? (nextMatch.away_team as any)?.name : (nextMatch.home_team as any)?.name
      notifs.push({
        id: `tactique-starter-${nextMatch.id}`,
        type: 'tactique_selected',
        title: 'Tu es titulaire ! ⚽',
        message: `Tu fais partie du 5 majeur pour le match contre ${opp || 'l\'adversaire'}`,
        href: '/my-team?tab=tactique',
        createdAt: nextMatch.scheduled_at ? new Date(nextMatch.scheduled_at) : new Date(),
        urgent: true,
      })
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
