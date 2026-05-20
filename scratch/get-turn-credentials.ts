// Supabase Edge Function : get-turn-credentials
// Génère des credentials TURN temporaires via l'API Metered.ca
// La secret key n'est JAMAIS exposée au front-end.
//
// Déployer via le dashboard Supabase :
// Edge Functions → New Function → coller ce code

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const secretKey = Deno.env.get('METERED_SECRET_KEY')
    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: 'METERED_SECRET_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Appel API Metered pour obtenir des credentials TURN temporaires (TTL 1h)
    const meteredDomain = 'league-h5.metered.live'
    const url = `https://${meteredDomain}/api/v1/turn/credentials?apiKey=${secretKey}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Metered API error: ${response.status} ${response.statusText}`)
    }

    // Metered retourne un tableau de RTCIceServer
    const iceServers = await response.json()

    return new Response(
      JSON.stringify({ iceServers }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    console.error('[get-turn-credentials]', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
