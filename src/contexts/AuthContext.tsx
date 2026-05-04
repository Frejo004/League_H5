import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types/database'

interface AuthContextValue {
  session: Session | null
  user: Session['user'] | null
  profile: Profile | null
  role: UserRole | null
  isLoading: boolean
  isAdmin: boolean
  isCaptain: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession]     = useState<Session | null>(null)
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
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
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false)
    }, 5000)

    // Bootstrap : lit la session depuis le storage local
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

    // Écoute tous les changements de session (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return
        if (event === 'INITIAL_SESSION') return

        setSession(newSession)

        if (newSession?.user) {
          await fetchProfile(newSession.user.id)
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
  }, [fetchProfile])

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await fetchProfile(session.user.id)
  }, [session?.user?.id, fetchProfile])

  async function signOut() {
    setSession(null)
    setProfile(null)
    // Redirection fiable via window.location (fonctionne même hors contexte React Router)
    window.location.href = '/auth/login'
    try { await supabase.auth.signOut() } catch {
      try { await supabase.auth.signOut({ scope: 'local' }) } catch { /* ignore */ }
    }
  }

  const role = profile?.role ?? null

  return (
    <AuthContext.Provider value={{
      session,
      user:      session?.user ?? null,
      profile,
      role,
      isLoading,
      isAdmin:   role === 'admin',
      isCaptain: role === 'captain' || role === 'admin',
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export { AuthContext }
