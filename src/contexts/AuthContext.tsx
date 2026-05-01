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
    // Timeout de sécurité — isLoading ne peut pas rester true indéfiniment
    const timeout = setTimeout(() => setIsLoading(false), 5000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
          setIsLoading(false)
        }
      }
    )

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
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
    setIsLoading(false)
    setProfile(null)
    setSession(null)
    await supabase.auth.signOut()
    navigateTo('/auth/login')
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
