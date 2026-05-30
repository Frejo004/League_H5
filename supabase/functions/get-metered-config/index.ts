import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { matchId } = await req.json()
    if (!matchId) throw new Error('matchId is required')

    // 1. Authentification de l'utilisateur via le token Supabase
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const denoEnv = (globalThis as unknown as { Deno?: { env: { get: (key: string) => string | undefined } } }).Deno?.env
    const supabaseUrl = denoEnv?.get('SUPABASE_URL')
    const supabaseServiceRoleKey = denoEnv?.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Supabase environment variables not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) throw new Error('Utilisateur non authentifié')

    // 2. Vérifier les permissions : Admin ou video_reporter_id délégué
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const { data: match } = await supabase
      .from('matches')
      .select('video_reporter_id, finished_at')
      .eq('id', matchId)
      .single()

    const isAdmin = profile?.role === 'admin'
    
    // Vérifier si le reporter vidéo est autorisé et si on est dans la fenêtre de 10 min après la fin
    let isVideoReporter = false
    if (match?.video_reporter_id === user.id) {
      const finishedAt = match.finished_at ? new Date(match.finished_at).getTime() : null
      const tenMinutesInMs = 10 * 60 * 1000
      const isWithinTenMinutes = !finishedAt || (Date.now() - finishedAt < tenMinutesInMs)
      
      if (isWithinTenMinutes) {
        isVideoReporter = true
      }
    }

    if (!isAdmin && !isVideoReporter) {
      return new Response(
        JSON.stringify({ error: 'Permission refusée pour diffuser ce match' }),
        { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const secretKey = denoEnv?.get('METERED_SECRET_KEY')
    // Nettoyer le domaine : enlever https:// ou http:// s'il est présent dans le secret
    const rawDomain = denoEnv?.get('METERED_DOMAIN') ?? 'league-h5.metered.live'
    const meteredDomain = rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')

    if (!secretKey) {
      throw new Error('METERED_SECRET_KEY not configured')
    }

    // Metered room names must be lowercase alphanumeric + hyphens, max 60 chars
    const roomName = `match-${matchId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60)

    // 1. Try to fetch the room first — if it exists, skip creation
    const getRes = await fetch(
      `https://${meteredDomain}/api/v1/room/${roomName}?secretKey=${secretKey}`
    )

    if (getRes.status === 401 || getRes.status === 403) {
      throw new Error('METERED_SECRET_KEY invalide ou non autorisé (HTTP ' + getRes.status + ')')
    }

    if (!getRes.ok) {
      // Room doesn't exist yet (404) — create it
      const createRes = await fetch(`https://${meteredDomain}/api/v1/room?secretKey=${secretKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName,
          privacy: 'public',
        })
      })

      const createData = await createRes.json()

      if (!createRes.ok) {
        console.error('[get-metered-config] Room creation failed:', createData)
        throw new Error(createData.message || `Failed to create Metered room (HTTP ${createRes.status})`)
      }

      console.log('[get-metered-config] Room created:', roomName)
    } else {
      console.log('[get-metered-config] Room already exists:', roomName)
    }

    // IMPORTANT: Le SDK Metered Global SFU attend l'URL SANS https://
    return new Response(
      JSON.stringify({ 
        roomURL: `${meteredDomain}/${roomName}`,
        meteredDomain,
        roomName,
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[get-metered-config]', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})
