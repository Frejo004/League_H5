import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { navigateTo } from '@/router'
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
  const [session, setSession]   = useState<Session | null>(null)
  const [profile, setProfile]   = useState<Profile | null>(null)
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
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // Safety net : si onAuthStateChange ne se déclenche pas dans les 4s
    const safetyTimeout = setTimeout(() => setIsLoading(false), 4000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        clearTimeout(safetyTimeout)
        setSession(newSession)

        if (newSession?.user) {
          await fetchProfile(newSession.user.id)

          // Rediriger vers l'app seulement depuis une page auth
          if (event === 'SIGNED_IN') {
            const path = window.location.pathname
            if (path.startsWith('/auth')) {
              navigateTo('/')
            }
          }
        } else {
          setProfile(null)
          setIsLoading(false)

          if (event === 'SIGNED_OUT') {
            navigateTo('/auth/login')
          }
        }
      }
    )

    return () => {
      clearTimeout(safetyTimeout)
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const refreshProfile = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) return
    await fetchProfile(userId)
  }, [session?.user?.id, fetchProfile])

  // ✅ Ne pas toucher à l'état local — laisser onAuthStateChange tout gérer
  async function signOut() {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error signing out:', err)
      // Fallback manuel si Supabase ne répond pas
      setProfile(null)
      setSession(null)
      setIsLoading(false)
      navigateTo('/auth/login')
    }
  }

  const role = profile?.role ?? null

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        role,
        isLoading,
        isAdmin: role === 'admin',
        isCaptain: role === 'captain' || role === 'admin',
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
