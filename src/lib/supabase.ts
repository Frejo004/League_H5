import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl    = import.meta.env.VITE_SUPABASE_URL    as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

// Le Web Lock natif du navigateur entre en conflit avec certaines extensions
// (VPN, ad blockers). On le remplace par un mutex en mémoire qui garantit
// l'exécution séquentielle des rafraîchissements de token sans collision.
let _lockChain: Promise<unknown> = Promise.resolve()
const lockImpl = <R>(_name: string, _timeout: number, fn: () => Promise<R>): Promise<R> => {
  const next = _lockChain.then(() => fn())
  _lockChain = next.then(() => {}, () => {})
  return next
}

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