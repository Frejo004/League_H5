import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const denoEnv = (globalThis as unknown as { Deno?: { env: { get: (key: string) => string | undefined } } }).Deno?.env
    const secretKey = denoEnv?.get('METERED_SECRET_KEY')
    const meteredDomain = denoEnv?.get('METERED_DOMAIN') ?? 'league-h5.metered.live'

    if (!secretKey) {
      return new Response(
        JSON.stringify({ error: 'METERED_SECRET_KEY not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const response = await fetch(`https://${meteredDomain}/api/v1/turn/credentials?apiKey=${secretKey}`)
    if (!response.ok) {
      throw new Error(`Metered API error: ${response.status} ${response.statusText}`)
    }

    const iceServers = await response.json()
    if (!Array.isArray(iceServers) || iceServers.length === 0) {
      throw new Error('Metered API returned no ICE servers')
    }

    return new Response(
      JSON.stringify({ iceServers }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[get-turn-credentials]', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})
