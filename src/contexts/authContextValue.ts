import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@/types/database'

export interface AuthContextValue {
  session: Session | null
  user: Session['user'] | null
  profile: Profile | null
  role: UserRole | null
  isLoading: boolean
  isProfileLoading: boolean
  isAdmin: boolean
  isCaptain: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
