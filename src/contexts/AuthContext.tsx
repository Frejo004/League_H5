import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react'
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
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    // Safety timeout : garantit que isLoading passe à false même si
    // onAuthStateChange ne fire pas (réseau coupé, erreur inattendue…)
    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false)
    }, 5000)

    // Bootstrap immédiat : récupère la session depuis le storage local
    // sans attendre le réseau. Évite le blocage sur loading après navigation.
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return
      setSession(initialSession)
      if (initialSession?.user) {
        fetchProfile(initialSession.user.id).finally(() => {
          if (isMounted) {
            clearTimeout(safetyTimer)
            setIsLoading(false)
          }
        })
      } else {
        clearTimeout(safetyTimer)
        setIsLoading(false)
      }
    })

    // onAuthStateChange gère les changements ultérieurs (login, logout,
    // refresh de token) mais ne pilote plus isLoading.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return

        // INITIAL_SESSION est déjà géré par getSession() ci-dessus
        if (event === 'INITIAL_SESSION') return

        setSession(newSession)

        if (newSession?.user) {
          await fetchProfile(newSession.user.id)

          if (event === 'SIGNED_IN') {
            const path = window.location.pathname
            // Ne rediriger que si l'utilisateur vient d'une page /auth
            if (path.startsWith('/auth')) {
              navigateTo('/')
            }
          }
        } else {
          setProfile(null)

          if (event === 'SIGNED_OUT') {
            navigateTo('/auth/login')
          }
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
    const userId = session?.user?.id
    if (!userId) return
    await fetchProfile(userId)
  }, [session?.user?.id, fetchProfile])

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } catch {
      // Fallback local si le réseau est indisponible ou le token déjà expiré
      await supabase.auth.signOut({ scope: 'local' })
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

export { AuthContext }
