import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { navigateTo } from '@/router'
import type { Profile, UserRole } from '@/types/database'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  role: UserRole | null
  isLoading: boolean
  isAdmin: boolean
  isCaptain: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // ✅ onAuthStateChange est la source de vérité unique
    // Il se déclenche immédiatement avec la session existante (INITIAL_SESSION)
    // puis à chaque changement (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED...)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)

        if (session?.user) {
          await fetchProfile(session.user.id)

          if (event === 'SIGNED_IN') {
            const currentPath = window.location.pathname
            if (currentPath.startsWith('/auth')) {
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

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId: string) {
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
  }

  async function signOut() {
    try {
      await supabase.auth.signOut()
      // onAuthStateChange(SIGNED_OUT) gère setProfile, setSession et la navigation
    } catch (error) {
      console.error('Error signing out:', error)
      // Fallback si Supabase ne répond pas
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
