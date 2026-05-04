import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl    = import.meta.env.VITE_SUPABASE_URL    as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

// Le Web Lock natif du navigateur entre en conflit avec les extensions
// de navigateur (VPN, ad blockers) qui volent le lock.
// On le remplace par un no-op dans tous les environnements.
const lockImpl = <R>(_name: string, _timeout: number, fn: () => Promise<R>): Promise<R> => fn()

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: true,
    lock: lockImpl,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
  db: {
    schema: 'public',
  },
})
