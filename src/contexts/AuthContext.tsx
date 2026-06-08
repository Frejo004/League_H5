import { createContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Session, RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types/database'

/**
 * ⚠️ ATTENTION : NE PAS MODIFIER LA LOGIQUE D'AUTHENTIFICATION SANS COMPRENDRE LE FLUX COMPLET
 * 
 * Ce contexte gère l'authentification et le chargement du profil utilisateur.
 * La logique est complexe car Supabase déclenche plusieurs événements successifs :
 * 
 * 1. INITIAL_SESSION : Au chargement de l'app (session existante ou null)
 * 2. SIGNED_IN : Après signInWithPassword() OU juste après INITIAL_SESSION si déjà connecté
 * 3. TOKEN_REFRESHED : Rafraîchissement automatique du token
 * 4. SIGNED_OUT : Après signOut()
 * 
 * PROBLÈME RÉSOLU : Supabase déclenche SIGNED_IN même après INITIAL_SESSION, ce qui causait
 * un double chargement du profil et bloquait l'interface sur "Profile loading...".
 * 
 * SOLUTION : Vérifier si le profil est déjà chargé avant de le recharger lors de SIGNED_IN.
 * 
 * ⚠️ Toute modification de cette logique peut casser le flux d'authentification.
 * ⚠️ Tester minutieusement : connexion, déconnexion, rafraîchissement, retour après fermeture.
 */

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
  const queryClient = useQueryClient()
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
      
      // Toujours mettre isLoading à false après avoir chargé le profil
      setIsLoading(false)
    } catch (err) {
      console.error('[AuthContext] Error fetching profile:', err)
      // Même en cas d'erreur, débloquer le chargement
      setIsLoading(false)
    } finally {
      fetchingRef.current = false
      setIsProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    let profileSubscription: RealtimeChannel | null = null

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
            // Écouter les changements sur le profil en temps réel (ex: approbation admin)
            profileSubscription = supabase
              .channel(`public:profiles:id=eq.${newSession.user.id}`)
              .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'profiles', 
                filter: `id=eq.${newSession.user.id}` 
              }, (payload) => {
                console.log('👤 Profile updated in realtime:', payload.new)
                setProfile(payload.new as Profile)
                // Invalider les queries si le rôle change pour débloquer les accès
                if ((payload.old as Profile).role !== (payload.new as Profile).role) {
                  queryClient.invalidateQueries()
                }
              })
              .subscribe()

            await fetchProfile(newSession.user.id).catch(() => {})
          }
          
          if (isMounted) {
            clearTimeout(safetyTimer)
            setIsLoading(false)
            setIsProfileLoading(false)
          }
          return
        }

        // ⚠️ IMPORTANT : Ne pas modifier cette logique sans comprendre le flux complet
        // Supabase déclenche SIGNED_IN même après INITIAL_SESSION, ce qui peut causer
        // un double chargement du profil et bloquer l'interface sur "Profile loading..."
        if (newSession?.user) {
          const currentUserId = newSession.user.id
          
          // SIGNED_IN : Vérifier si le profil est déjà chargé avant de recharger
          // Cela évite le rechargement inutile après INITIAL_SESSION
          if (event === 'SIGNED_IN') {
            // Invalider les requêtes pour rafraîchir les données (saison, etc.) avec les droits du user
            queryClient.invalidateQueries()
            
            // Si le profil est déjà chargé pour ce user, ne rien faire
            if (profileRef.current?.id === currentUserId) {
              setIsLoading(false)
              setIsProfileLoading(false)
              return
            }
            
            // Sinon, charger le profil (cas d'une vraie nouvelle connexion)
            await fetchProfile(currentUserId)
            if (isMounted) {
              setIsLoading(false)
            }
            return
          }
          
          // TOKEN_REFRESHED : Ne pas recharger si on a déjà le profil
          if (event === 'TOKEN_REFRESHED' && profileRef.current?.id === currentUserId) {
            setIsProfileLoading(false)
            return
          }
          
          // Autres événements : charger le profil
          await fetchProfile(currentUserId)
        } else {
          setProfile(null)
          setIsProfileLoading(false)
          // Réinitialiser isLoading lors de la déconnexion
          if (profileSubscription) supabase.removeChannel(profileSubscription)
          if (event === 'SIGNED_OUT') {
            queryClient.clear()
            setIsLoading(false)
          }
        }
      }
    )

    return () => {
      isMounted = false
      clearTimeout(safetyTimer)
      subscription.unsubscribe()
      if (profileSubscription) supabase.removeChannel(profileSubscription)
    }
  }, [fetchProfile, queryClient])

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await fetchProfile(session.user.id)
  }, [session, fetchProfile])

  async function signOut() {
    try {
      await supabase.auth.signOut()
    } catch {
      // En cas d'échec de la déconnexion standard, tenter une déconnexion locale.
      // Cela peut être utile pour certains scénarios de session ou versions de Supabase.
      // Si ce n'est pas un problème connu ou nécessaire, cette partie peut être simplifiée.
      try { await supabase.auth.signOut({ scope: 'local' }) } catch (err) { console.error('[AuthContext] Error during local sign out fallback:', err); }
    }
    setSession(null)
    setProfile(null)
    window.location.href = '/auth/login'
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