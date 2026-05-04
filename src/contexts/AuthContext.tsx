import { createContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types/database'

interface AuthContextValue {
  session: Session | null
  user: Session['user'] | null
  profile: Profile | null
  role: UserRole | null
  isLoading: boolean        // initialisation globale
  isProfileLoading: boolean // re-fetch profil en cours (token refresh, etc.)
  isAdmin: boolean
  isCaptain: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]           = useState<Session | null>(null)
  const [profile, setProfile]           = useState<Profile | null>(null)
  const [isLoading, setIsLoading]       = useState(true)
  const [isProfileLoading, setIsProfileLoading] = useState(false)

  // Ref pour éviter les fetch concurrents
  const fetchingRef = useRef(false)

  const fetchProfile = useCallback(async (userId: string) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setIsProfileLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) throw error
      setProfile(data)
    } catch (err) {
      console.error('Error fetching profile:', err)
      // Ne pas mettre profile à null sur erreur réseau — garder l'ancien
    } finally {
      fetchingRef.current = false
      setIsProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false)
    }, 5000)

    // Bootstrap : lit la session depuis le storage local immédiatement
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!isMounted) return
      setSession(s)
      if (s?.user) {
        fetchProfile(s.user.id).finally(() => {
          if (isMounted) { clearTimeout(safetyTimer); setIsLoading(false) }
        })
      } else {
        clearTimeout(safetyTimer)
        setIsLoading(false)
      }
    })

    // Écoute tous les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return
        if (event === 'INITIAL_SESSION') return

        setSession(newSession)

        if (newSession?.user) {
          // Sur TOKEN_REFRESHED : re-fetch seulement si le user change
          // ou si on n'a pas encore de profil
          const currentUserId = newSession.user.id
          if (event === 'TOKEN_REFRESHED' && profile?.id === currentUserId) {
            // Profil déjà chargé pour ce user — pas besoin de re-fetch
            return
          }
          await fetchProfile(currentUserId)
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      isMounted = false
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProfile])

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await fetchProfile(session.user.id)
  }, [session?.user?.id, fetchProfile])

  async function signOut() {
    setSession(null)
    setProfile(null)
    window.location.href = '/auth/login'
    try { await supabase.auth.signOut() } catch {
      try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* ignore */ }
    }
  }

  const role = profile?.role ?? null

  return (
    <AuthContext.Provider value={{
      session,
      user:             session?.user ?? null,
      profile,
      role,
      isLoading,
      isProfileLoading,
      isAdmin:          role === 'admin',
      isCaptain:        role === 'captain' || role === 'admin',
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthContext }
