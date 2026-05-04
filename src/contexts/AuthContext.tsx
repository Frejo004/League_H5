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

  // Refs pour éviter les fetch concurrents et tracker l'état actuel
  const fetchingRef = useRef(false)
  const initializedRef = useRef(false)
  const profileRef = useRef<Profile | null>(null)

  // Sync profileRef avec profile state
  useEffect(() => {
    profileRef.current = profile
  }, [profile])

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
      console.error('[AuthContext] Error fetching profile:', err)
    } finally {
      fetchingRef.current = false
      setIsProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    // Filet de sécurité absolu : si tout échoue, on débloque après 5 s
    const safetyTimer = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false)
        setIsProfileLoading(false)
      }
    }, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return

        setSession(newSession)

        if (event === 'INITIAL_SESSION') {
          if (initializedRef.current) return
          initializedRef.current = true
          
          if (newSession?.user) {
            await fetchProfile(newSession.user.id).catch(() => {})
          }
          
          if (isMounted) {
            clearTimeout(safetyTimer)
            setIsLoading(false)
            setIsProfileLoading(false)
          }
          return
        }

        // Événements suivants : SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT…
        if (newSession?.user) {
          const currentUserId = newSession.user.id
          
          // Ignorer SIGNED_IN juste après INITIAL_SESSION (double événement)
          if (event === 'SIGNED_IN' && profileRef.current?.id === currentUserId) {
            setIsProfileLoading(false)
            return
          }
          
          // Si c'est juste un refresh de token et qu'on a déjà le profil, pas besoin de re-fetch
          if (event === 'TOKEN_REFRESHED' && profileRef.current?.id === currentUserId) {
            setIsProfileLoading(false)
            return
          }
          
          // Sinon, fetch le profil
          await fetchProfile(currentUserId)
        } else {
          setProfile(null)
          setIsProfileLoading(false)
        }
      }
    )

    return () => {
      isMounted = false
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
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