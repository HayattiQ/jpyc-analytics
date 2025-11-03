import appConfig from '../src/config.json'

declare const process: {
  env?: Record<string, string | undefined>
}

export const config = { runtime: 'edge' }

type ChainConfig = (typeof appConfig.chains)[number]

const chainsById = new Map<string, ChainConfig>(
  appConfig.chains
    .filter((chain) => typeof chain.subgraphUrl === 'string' && chain.subgraphUrl.length > 0)
    .map((chain) => [chain.id, chain])
)

const DEFAULT_TTL_SECONDS = 300
const DEFAULT_STALE_SECONDS = 900

const env = process?.env ?? {}

const ttlSeconds = Number(env.SUBGRAPH_CACHE_TTL ?? DEFAULT_TTL_SECONDS)
const staleSeconds = Number(env.SUBGRAPH_CACHE_STALE ?? Math.max(DEFAULT_STALE_SECONDS, ttlSeconds))

const bearerToken = env.GRAPH_API_BEARER

const encoder = new TextEncoder()

async function digestHex(input: string) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(input))
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function buildCacheRequest(chainId: string, payloadHash: string) {
  return new Request(`https://cache.jpyc/${chainId}/${payloadHash}`, { method: 'GET' })
}

function buildUpstreamHeaders() {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (bearerToken && bearerToken.length > 0) {
    headers.set('Authorization', `Bearer ${bearerToken}`)
  }
  return headers
}

function cloneResponse(source: Response, extraHeaders: Record<string, string>) {
  const headers = new Headers(source.headers)
  Object.entries(extraHeaders).forEach(([key, value]) => headers.set(key, value))
  return source.text().then((body) => new Response(body, { status: source.status, headers }))
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: { 'Allow': 'POST' }
    })
  }

  const { searchParams } = new URL(request.url)
  const chainId = searchParams.get('chain')
  if (!chainId) {
    return new Response('Missing chain parameter', { status: 400 })
  }

  const chain = chainsById.get(chainId)
  if (!chain) {
    return new Response('Unsupported chain', { status: 404 })
  }

  const body = await request.text()
  if (body.length === 0) {
    return new Response('Missing body', { status: 400 })
  }

  const payloadHash = await digestHex(`${chainId}:${body}`)
  const cacheKey = buildCacheRequest(chainId, payloadHash)
  const cacheStorage = caches as CacheStorage & { default?: Cache }
  const cache = cacheStorage.default ?? (await caches.open('subgraph-cache'))

  const cached = await cache.match(cacheKey)
  if (cached) {
    const cachedResponse = await cloneResponse(cached, {
      'Cache-Control': `s-maxage=${ttlSeconds}, stale-while-revalidate=${staleSeconds}`,
      'x-cache': 'HIT'
    })
    return cachedResponse
  }

  const upstream = await fetch(chain.subgraphUrl, {
    method: 'POST',
    headers: buildUpstreamHeaders(),
    body
  })

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': `s-maxage=${ttlSeconds}, stale-while-revalidate=${staleSeconds}`,
    'x-cache': 'MISS'
  }

  const response = await cloneResponse(upstream, baseHeaders)

  if (upstream.ok) {
    await cache.put(cacheKey, response.clone())
  }

  return response
}
