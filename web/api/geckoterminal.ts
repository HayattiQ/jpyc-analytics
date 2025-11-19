const BASE_URL = 'https://api.geckoterminal.com/api/v2'
const JPYC_TOKEN = '0xe7c3d8c9a439fede00d2600032d5db0be71c3c29'

const NETWORKS = [
  { id: 'eth', label: 'Ethereum' },
  { id: 'polygon_pos', label: 'Polygon' },
  { id: 'avax', label: 'Avalanche' }
] as const

type PriceChange = {
  h24?: string
}

type VolumeWindow = {
  h24?: string
}

type PoolAttributes = {
  address?: string
  name?: string
  pool_created_at?: string
  reserve_in_usd?: string
  base_token_price_usd?: string
  quote_token_price_usd?: string
  price_change_percentage?: PriceChange
  volume_usd?: VolumeWindow
}

type RelationshipRef = {
  data?: {
    id?: string
    type?: string
  }
}

type PoolRelationships = {
  base_token?: RelationshipRef
  quote_token?: RelationshipRef
  dex?: RelationshipRef
}

type GeckoPool = {
  id?: string
  type?: string
  attributes?: PoolAttributes
  relationships?: PoolRelationships
}

type GeckoPoolResponse = {
  data?: GeckoPool[]
  links?: Record<string, string>
}

export const config = { runtime: 'edge' }

const numberFrom = (value?: string) => {
  if (typeof value !== 'string') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const buildHeaders = () =>
  new Headers({
    Accept: 'application/json;version=20230203'
  })

const cacheHeaders = {
  'Cache-Control': 'public, s-maxage=60',
  'CDN-Cache-Control': 'public, s-maxage=60',
  'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
  'content-type': 'application/json; charset=utf-8'
}

const respondJson = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: cacheHeaders })

const fetchNetworkPools = async (networkId: string, page: string) => {
  const upstreamUrl = `${BASE_URL}/networks/${networkId}/tokens/${JPYC_TOKEN}/pools?page=${encodeURIComponent(page)}`

  const upstreamResponse = await fetch(upstreamUrl, { headers: buildHeaders() })
  const text = await upstreamResponse.text()

  if (!upstreamResponse.ok) {
    throw new Error(
      `GeckoTerminal error for ${networkId}: ${upstreamResponse.status} ${upstreamResponse.statusText} ${text}`
    )
  }

  const payload = JSON.parse(text) as GeckoPoolResponse
  const pools =
    payload.data?.map((pool) => {
      const attrs = pool.attributes ?? {}
      const rel = pool.relationships ?? {}
      const priceDelta = attrs.price_change_percentage ?? {}
      const volume = attrs.volume_usd ?? {}
      return {
        id: pool.id,
        networkId,
        address: attrs.address,
        name: attrs.name,
        dex: rel.dex?.data?.id,
        baseTokenId: rel.base_token?.data?.id,
        quoteTokenId: rel.quote_token?.data?.id,
        poolCreatedAt: attrs.pool_created_at,
        tvlUSD: numberFrom(attrs.reserve_in_usd),
        baseTokenPriceUSD: numberFrom(attrs.base_token_price_usd),
        quoteTokenPriceUSD: numberFrom(attrs.quote_token_price_usd),
        priceChange24h: numberFrom(priceDelta.h24),
        volume24hUSD: numberFrom(volume.h24)
      }
    }) ?? []

  return { pools, links: payload.links }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return respondJson(405, { error: 'Method Not Allowed' })
  }

  const url = new URL(request.url)
  const page = url.searchParams.get('page') ?? '1'
  const networkParam = url.searchParams.get('network')

  const targetNetworks =
    networkParam && NETWORKS.some((n) => n.id === networkParam)
      ? NETWORKS.filter((n) => n.id === networkParam)
      : NETWORKS

  const results = await Promise.all(
    targetNetworks.map(async (network) => {
      try {
        const res = await fetchNetworkPools(network.id, page)
        return { networkId: network.id, pools: res.pools, links: res.links }
      } catch (error) {
        return { networkId: network.id, error: String(error) }
      }
    })
  )

  const pools = results.flatMap((r) => r.pools ?? [])
  const errors = results.filter((r) => r.error).map((r) => ({ networkId: r.networkId, error: r.error as string }))

  return respondJson(200, {
    networks: targetNetworks.map((n) => n.id),
    tokenAddress: JPYC_TOKEN,
    page: Number(page) || 1,
    count: pools.length,
    pools,
    errors
  })
}
